/* This file contains query functions for the rainfall application */
import { db } from './db'
import { formatNumber } from './convertor'


// SQL for get rain fall from a range
const rainfall_data_querier = db.prepare<
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


// SQL
const total_day_querier = db.prepare<
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


//Function to query db given a range of date
export async function rainfall_sum(options:{
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
    console.log(options)
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