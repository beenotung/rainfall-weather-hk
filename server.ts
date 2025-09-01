import express from 'express'
import { print } from 'listening-on'
import { proxy } from './proxy'
import { db } from './db'
import { CalendarChinese } from 'date-chinese'
import { number } from '@beenotung/tslib'

let app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/data', (req, res) => {
  res.json({ dates: proxy.date.length })
})

let port = 8100
app.listen(port, () => {
  print(port)
})

app.post('/submit', async (req, res) => {
  try {
    // req.body contains the JSON sent from the client
    console.log('Received data:', req.body);  

    const district = req.body['district'];
    const start_date = req.body['start_date'];
    const end_date = req.body['end_date'];
    const start_hour = req.body['start_hour'];
    const start_minute = req.body['start_minute'];
    const end_hour = req.body['end_hour'];
    const end_minute = req.body['end_minute'];
    const gregorian_chinese = req.body['gregorian_chinese'];
    let start_year, start_month, start_day
    let end_year, end_month, end_day

    if(gregorian_chinese === 'gregorian_date'){
      [start_year, start_month, start_day] = parseDate(start_date);
      [end_year, end_month, end_day] = parseDate(end_date);
    }else{
      const [chinese_start_date, chinese_end_date] = date_convertor(start_date, end_date) as [string, string]
      [start_year, start_month, start_day] = parseDate(chinese_start_date);
      [end_year, end_month, end_day] = parseDate(chinese_end_date);
    }

    // Await the async rainfall_sum function
    let query_result = await rainfall_sum({
      district,
      start_year,
      end_year,
      start_month,
      start_day,
      end_month,
      end_day,
      start_hour,
      start_minute,
      end_hour,
      end_minute
    });

    console.log(query_result)
    
    // Send a response back to the client
    res.json({ query_result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Function to convert a string of date e.g. "10-01" to int month and day, e.g. [10, 1]
function parseDate(date : string) {
  const [year, month, day] = date.split('-')
  return [parseInt(year, 10), parseInt(month, 10), parseInt(day, 10)]
}

//Function to convert chinese date into gregorian date 
function date_convertor(start_date : string, end_date: string) : [string, string]{
  const [start_year, start_month, start_day] = start_date.split('-') //Assume the input of user is in Chinese date
  const [end_year, end_month, end_day] = end_date.split('-')
  let [start_chinese_cycle, start_chinese_year, start_chinese_leap] =  gregorian_to_chinese_date(start_date)
  let [end_chinese_cycle, end_chinese_year, end_chinese_leap] =  gregorian_to_chinese_date(end_date)

  let start_cal = new CalendarChinese(start_chinese_cycle, start_chinese_year, parseInt(start_month,10), start_chinese_leap, parseInt(start_day, 10))
  let end_cal = new CalendarChinese(end_chinese_cycle, end_chinese_year, parseInt(end_month,10), end_chinese_leap, parseInt(end_day, 10))
  
  let chinese_start_date = start_cal.toGregorian(parseInt(start_year,10))
  let chinese_end_date = end_cal.toGregorian(parseInt(end_year,10))

  console.log(typeof(chinese_start_date.year), chinese_end_date)

  let formatted_chinese_start_date = formatDate(chinese_start_date.year, chinese_start_date.month, chinese_start_date.day)
  let formatted_chinese_end_date = formatDate(chinese_end_date.year, chinese_end_date.month, chinese_end_date.day)
  return [ formatted_chinese_start_date, formatted_chinese_end_date ]
}

//Function to convert gregorian date to chinese date
function gregorian_to_chinese_date(date: string){
  const [year, month, day] = date.split('-').map(Number)
  let cal = new CalendarChinese()
  cal.fromGregorian(year, month, day)
  const [chinese_cycle, chinese_year, chinese_month, chinese_leap, chinese_day] = cal.get()
  return [chinese_cycle, chinese_year, chinese_leap] //Return Chinese cycle and year, then use it to convert by to Gregorian date
}

//Function to query db given a range of date
async function rainfall_sum(options:{
  district: string,
  start_year: number,
  end_year: number,
  start_month : number,
  start_day: number, 
  end_month : number,
  end_day: number,
  start_hour: number,
  start_minute: number,
  end_hour: number, 
  end_minute : number,
}){
  let {district, start_year, end_year, start_month, start_day, end_month, end_day, start_hour, start_minute, end_hour, end_minute} = options
  let district_id = district_handler(district) as number
  let query_result = rainfall_data_querier.all({
    district_id,
    start_year,
    end_year,
    start_month,
    start_day,
    end_month,
    end_day, 
    start_hour,
    start_minute,
    end_hour,
    end_minute
  })
  
  for(let i = 0; i < query_result.length; i++){
    let average = query_result[i]['total_amount'] / query_result[i]['data_count']
    query_result[i]['average_amount'] = Number(formatNumber(average));
  }

  return query_result
}

//Function to handle when use input chinese date
//1. Need to convert to chinese date, same gregorian date will get different chinese date
//2. Query db
function chinese_date_query_handler(chinese_date : string){

}

//Function to handle district inout and convert it to district.id
function district_handler(name : string) : number | null | undefined{
  let id : number | undefined
  if(name === "All"){
    return null
  }
  let selector = db.prepare<{name : string}, number>(/*sql*/`
    SELECT id FROM district WHERE district.name = :name
    `,).pluck()
  id = selector.get({name})
  return id
}

let rainfall_data_querier = db.prepare<
  {
      district_id : number,
      start_year: number, 
      end_year: number,
      start_month : number,
      start_day : number, 
      end_month : number, 
      end_day : number,
      start_hour: number,
      start_minute: number,
      end_hour: number,
      end_minute: number
  }, 
  {
    month : number,
    date : number,
    total_amount: number,
    data_count: number,
    average_amount: number
  }>(/*sql*/`
      SELECT 
        d.month, 
        d.day, 
        SUM(r.amount) as total_amount, 
        COUNT(DISTINCT d.year) AS data_count
      FROM 
        rainfall r
        JOIN date d ON r.date_id = d.id
        JOIN time t ON r.time_id = t.id
        JOIN district dist ON r.district_id = dist.id
      WHERE 
        --- Date Range Filter
        d.year BETWEEN :start_year AND :end_year
        AND
          (d.month > :start_month OR (d.month = :start_month AND d.day >= :start_day))
          AND
          (d.month < :end_month OR (d.month = :end_month AND d.day <= :end_day))
        --- Time Range Filter
        AND (
          (t.hour > :start_hour OR (t.hour = :start_hour AND t.minute >= :start_minute))
          AND
          (t.hour < :end_hour OR (t.hour = :end_hour AND t.minute <= :end_minute))
        )
        --- District Filter (if id is null, mean select all)
        AND (
          :district_id IS NULL OR r.district_id = :district_id
        )
      GROUP BY
        d.month,
        d.day
      ORDER BY
        d.month,
        d.day;
    `,)

let total_day_querier = db.prepare<
{
  start_year: number,
  end_year: number,
  start_month: number,
  start_day: number,
  end_month: number,
  end_day: number
}, {
  month: number,
  day: number,
  total_day: number
}>(/*sql*/`
    SELECT
      d.month,
      d.day,
      COUNT(*) AS data_count
    FROM 
      date d
    WHERE 
      d.year BETWEEN :start_year AND :end_year
    AND (
      (d.month > :start_month OR (d.month = :start_month AND d.day >= :start_day))
      AND
      (d.month < :end_month OR (d.month = :end_month AND d.day <= :end_day))
    )
    GROUP BY
      d.month, d.day
  `)

function formatNumber(x: number) {
  if (x >= 1) {
    return x.toFixed(2)
  }
  if (x >= 0.1) {
    return x.toFixed(3)
  }
  if (x >= 0.01) {
    return x.toFixed(4)
  }
  return x.toExponential(3)
}

//Function to format date to "YYYY-MM-DD" format 
function formatDate(year: number, month: number, day:number ) : string{
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}