import { filter } from "better-sqlite3-proxy";
import { proxy, Rainfall } from "./proxy";
import { knex } from "./knex";
import { db } from "./db";

type CounterItem = {
  total: number;
  count: number;
};

// district -> month -> day -> hour -> minute
type Counters = {
  [district_id: number]: {
    [month: number]: {
      [day: number]: {
        // [hour: number]: {
        //   [minute: number]: CounterItem;
        // };
        [time_index: number]: CounterItem;
      };
    };
  };
};
let counters: Counters = [];

let date_mode: DateMode = "chinese";
let time_mode: TimeMode = "15min";

type DateMode = "chinese" | "western";

type TimeMode = "15min" | "2hr" | "12hr" | "24hr";




export function onYearRange(
  years: [start: number, end: number],
  months: [start: number, end: number] = [1, 12],
  days: [start: number, end: number] = [1, 31],
  // If district_id is 0, all districts are included
  district_id: number = 0
) {
  let [start, end] = years;
  for (let year = start; year <= end; year++) {
    onRange(year, months, days, district_id);
  }
}

function onRange(
  year: number,
  months: [start: number, end: number],
  days: [start: number, end: number],
  district_id: number
) {
  process.stdout.write(`\r year: ${year}` + " ".repeat(10));

  let [start_month, end_month] = months
  let [start_day, end_day] = days

  let district_ids

  if (district_id === 0) {
    // If district_id is 0, all districts are included
    district_ids = Array.from({length: 22}, (_, i) => i + 1)
  }
  else{
    district_ids = [district_id]
  }


  let dates = filter(proxy.date, { year }).filter(date => {
    return date.month >= start_month && 
           date.month <= end_month && 
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
    `\r year: ${year} | month: ${month} | day: ${day}` + " ".repeat(5)
  );

  if (date_mode == "chinese") {
    let result = to_chinese_date(year, month, day);
    month = result.month;
    day = result.day;
  }

  let district_id = row.district_id!;
  let time_index = to_time_index(hour, minute);

  counters[district_id] ??= [];
  counters[district_id][month] ??= [];
  counters[district_id][month][day] ??= [];

  counters[district_id][month][day][time_index] ??= { total: 0, count: 0 };
  let item = counters[district_id][month][day][time_index];

  //   counters[district_id][month][day][hour] ??= [];
  //   counters[district_id][month][day][hour][minute] ??= { total: 0, count: 0 };
  //   let item = counters[district_id][month][day][hour][minute];

  item.total += row.amount;
  item.count++;
}

function to_chinese_date(year: number, month: number, day: number) {
  return { month, day };
}

function to_time_index(hour: number, minute: number) {
  let index = hour * (60 / 15) + minute / 15;
  switch (time_mode) {
    case "15min":
      return index;
    case "2hr":
      return Math.floor(index / ((2 * 60) / 15));
    case "12hr":
      return Math.floor(index / ((12 * 60) / 15));
    case "24hr":
      return 0;
    default:
      throw new TypeError("invalid time_mode: " + time_mode);
  }
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
  counters = []
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
