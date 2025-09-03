import { filter } from "better-sqlite3-proxy";
import { proxy, Rainfall } from "./proxy";
import { knex } from "./knex";
import { db } from "./db";
import { CalendarChinese } from "date-chinese";

type CounterItem = {
  total: number;
  count: number;
};

// district -> month -> day (time aggregated within the query)
type Counters = {
  [district_id: number]: {
    [month: number]: {
      [day: number]: CounterItem;
    };
  };
};

let counters: Counters = {};

let date_mode: DateMode = "western";

type DateMode = "chinese" | "western";

export function onYearRange(
  years: [start: number, end: number],
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Array of specific months
  days: [start: number, end: number] = [1, 31],
  hours: [start: number, end: number] = [0, 23],
  minutes: [start: number, end: number] = [0, 59],
  // If district_id is 0, all districts are included
  district_id: number = 0
) {
  let [start, end] = years;
  for (let year = start; year <= end; year++) {
    onRange(year, months, days, hours, minutes, district_id);
  }
}

function onRange(
  year: number,
  months: number[], // Array of specific months
  days: [start: number, end: number],
  hours: [start: number, end: number],
  minutes: [start: number, end: number],
  district_id: number
) {
  process.stdout.write(`\r year: ${year}` + " ".repeat(10));

  let [start_day, end_day] = days
  let [start_hour, end_hour] = hours
  let [start_minute, end_minute] = minutes

  // Get valid time_ids for the time range
  const valid_time_ids = getTimeIdsInRange(start_hour, end_hour, start_minute, end_minute);

  let district_ids

  if (district_id === 0) {
    // If district_id is 0, all districts are included
    district_ids = Array.from({length: 22}, (_, i) => i + 1)
  }
  else{
    district_ids = [district_id]
  }

  let dates = filter(proxy.date, { year }).filter(date => {
    return months.includes(date.month) && // Check if month is in the selected months array
           date.day >= start_day && 
           date.day <= end_day;
  });

  //console.log(`Found ${dates.length} dates for year ${year}`);

  //let dates = filter(proxy.date, { year });
  for (let date of dates) {
    
    for (let district_id of district_ids) {
      let rows = filter(proxy.rainfall, {
        date_id: date.id!,
        district_id: district_id,
      }).filter(row => {
        return valid_time_ids.includes(row.time_id!);
      });
      
      //console.log(`Found ${rows.length} rows for date ${date.id}`);
      for (let row of rows) {
        onRow(row);
      }
    }
  }
}

function onRow(row: Rainfall) {
  let { year, month, day } = row.date!;
  let { hour, minute } = row.time!;

  process.stdout.write(
    `\r year: ${year} | month: ${month} | day: ${day} | hour: ${hour} | minute: ${minute}` + " ".repeat(5)
  );

  if (date_mode == "chinese") {
    let result = to_chinese_date(year, month, day);
    month = result.month;
    day = result.day;
  }

  let district_id = row.district_id!;

  // Simplified structure - aggregate all time data for the day
  counters[district_id] ??= {};
  counters[district_id][month] ??= {};
  counters[district_id][month][day] ??= { total: 0, count: 0 };
  
  let item = counters[district_id][month][day];
  item.total += row.amount;
  item.count++;
}

export function to_chinese_date(year: number, month: number, day: number) {
  // Create CalendarChinese instance and convert from Gregorian
  const chineseCalendar = new CalendarChinese();
  chineseCalendar.fromGregorian(year, month, day);
  
  // Check what properties are available
  console.log('CalendarChinese object:', chineseCalendar);
  
  return { 
    month: (chineseCalendar as any).month || 1, 
    day: (chineseCalendar as any).day || 1
  };
}

// Get time_id from database for specific hour/minute
export function getTimeId(hour: number, minute: number): number | undefined {
  const timeRecord = filter(proxy.time, { hour, minute })[0];
  return timeRecord?.id || undefined;
}

// Get all time_ids within a time range
export function getTimeIdsInRange(start_hour: number, end_hour: number, start_minute: number, end_minute: number): number[] {
  const start_time_id = getTimeId(start_hour, start_minute);
  const end_time_id = getTimeId(end_hour, end_minute);
  
  if (start_time_id === undefined || end_time_id === undefined) {
    console.warn(`Invalid time range: ${start_hour}:${start_minute} to ${end_hour}:${end_minute}`);
    return [];
  }
  
  // Generate array of all time_ids between start and end (inclusive)
  const time_ids: number[] = [];
  for (let id = start_time_id; id <= end_time_id; id++) {
    time_ids.push(id);
  }
  
  return time_ids;
}

function main() {
  onYearRange([2020, 2023]);
  debugger;
  console.log(counters);
}

// get counters
export function get_counters(){
  return counters
}

export function reset_counters(){
  counters = {}
}

// Helper functions for common use cases
export function getRainfallForSpecificTime(
  years: [number, number],
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  days: [number, number] = [1, 31],
  hour: number,
  minute: number,
  district_id: number = 0
) {
  onYearRange(years, months, days, [hour, hour], [minute, minute], district_id);
  return get_counters();
}

export function getRainfallForTimeRange(
  years: [number, number],
  months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  days: [number, number] = [1, 31],
  start_hour: number,
  end_hour: number,
  start_minute: number = 0,
  end_minute: number = 59,
  district_id: number = 0
) {
  onYearRange(years, months, days, [start_hour, end_hour], [start_minute, end_minute], district_id);
  return get_counters();
}

// Calculate average rainfall for a specific period
export function getAverageRainfall(
  district_id: number,
  month: number,
  day: number
): number {
  const item = counters[district_id]?.[month]?.[day];
  return item ? item.total / item.count : 0;
}

// Get total rainfall for a specific day
export function getTotalRainfall(
  district_id: number,
  month: number,
  day: number
): number {
  const item = counters[district_id]?.[month]?.[day];
  return item ? item.total : 0;
}

// Get rainfall count (number of records) for a specific day
export function getRainfallCount(
  district_id: number,
  month: number,
  day: number
): number {
  const item = counters[district_id]?.[month]?.[day];
  return item ? item.count : 0;
}






//main();

/*let query = knex("rainfall");
if (1) {
  query = query.where("year", ">=", 2020);
} else {
  query = query.where("chinese_year", ">=", 2020);
}
let { sql, bindings } = query.toSQL();
let result = db.prepare(sql).all(bindings);*/
