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
    const [start_year, start_month, start_day] = parseDate(start_date);
    const [end_year, end_month, end_day] = parseDate(end_date);

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

//Function to convert gregorian date to chinese date
function gregorian_to_chinese_date(date : string) : number[][] {
  const [month, day] = date.split('-')
  let date_list = []
  for(let year = 2002; year < 2024; year++){
    let cal = new CalendarChinese()
    cal.fromGregorian(year, parseInt(month, 10), parseInt(day, 10))
    let [chinese_cycle, chinese_year, chinese_month, chinese_leap, chinese_day] = cal.get()
    date_list.push([year, chinese_month, chinese_day])
  }
  return date_list
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
  console.log(query_result)
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