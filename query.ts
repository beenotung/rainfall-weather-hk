import { dA } from '@fullcalendar/core/internal-common'
import { QueryInput, QueryOutput } from './api'
import { to_chinese_date } from './date'
import { proxy } from './proxy'
import { filter } from 'better-sqlite3-proxy'
import { timeStamp } from 'console'

// time mode: 15min | 2hrs | 12 hrs | 24hrs
// average in every 15mins(every record) |
// 2hrs (8 records) | 12hrs (48 records) | 24hrs (full day)

// district -> month -> day (time aggregated within the query)
type Counters = {
  [district_id: number]: {
    [month: number]: {
      [day: number]: CounterItem
    }
  }
}

/* 

type Counters = {
  [district_id: number]: {
    [month: number]: {
      [day: number]: {
        // index size calculated by time range / time mode
        [time_index: number]:{count: number, total: number}
      }
    }
  }
}

*/

type CounterItem = {
  // total amount of rainfall
  total: number
  // how many records in time index
  count: number
}

export function query(input: QueryInput): QueryOutput {
  // get date needs to be calculated
  function* loop_stats_dates() {
    if (input.date_mode === 'gregorian_date') {
      for (let year = input.start_year; year <= input.end_year; year++) {
        for (let month of input.monthes) {
          for (let day = input.start_day; day <= input.end_day; day++) {
            //console.log(year, month, day)
            if (isValidDate(year, month, day)) {
              yield { year, month, day }
            }
          }
        }
      }
      return
    }

    if (input.date_mode === 'chinese_date') {
      // chinese month -> chinese day -> boolean
      let viewing_chinese_dates: Record<number, Set<number>> = {}
      for (let month of input.monthes) {
        for (let day = input.start_day; day <= input.end_day; day++) {
          let chiense_date = to_chinese_date({
            year: input.view_year,
            month,
            day,
          })
          viewing_chinese_dates[chiense_date.month] ??= new Set()
          viewing_chinese_dates[chiense_date.month].add(chiense_date.day)
        }
      }

      for (let year = input.start_year; year <= input.end_year; year++) {
        for (let month = 1; month <= 12; month++) {
          for (let day = 1; day <= 31; day++) {
            let chinese_date = to_chinese_date({ year, month, day })
            if (
              viewing_chinese_dates[chinese_date.month]?.has(chinese_date.day)
            ) {
              //console.log(year, month, day)
              if (isValidDate(year, month, day)) {
                yield { year, month, day }
              }
            }
          }
        }
      }

      return
    }

    throw new Error('invalid date mode: ' + input.date_mode)
  }

  let counters: Counters = {}

  function get_counter(
    district_id: number,
    year: number,
    month: number,
    day: number,
  ) {
    if (input.date_mode === 'chinese_date') {
      let chinese_date = to_chinese_date({ year, month, day })
      month = chinese_date.month
      day = chinese_date.day
    }

    counters[district_id] ??= {}
    counters[district_id][month] ??= {}
    counters[district_id][month][day] ??= { total: 0, count: 0 }
    return counters[district_id][month][day]
  }

  // get time ids in range for database query
  let times_ids = getTimeIdsInRange(
    input.start_hour,
    input.end_hour,
    input.start_minute,
    input.end_minute,
  )

  // should either return empty array or one element array
  function search(district_id: number, data_id: number, time_id: number) {
    const row = filter(proxy.rainfall, {
      date_id: data_id,
      time_id: time_id,
      district_id: district_id,
    })

    return row
  }

  function loop_distrists(district_id: number) {
    for (let date of loop_stats_dates()) {
      // get the data id arrcording to current looping date
      const date_id = filter(proxy.date, {
        year: date.year,
        month: date.month,
        day: date.day,
      })[0].id!
      for (let time_id of times_ids) {
        let counter = get_counter(district_id, date.year, date.month, date.day)

        //console.log(date_id, time_id, input.district_id)
        const row = search(input.district_id, date_id, time_id)
        if (row.length === 0) {
          continue
        } else {
          counter.total += row[0].amount
          counter.count++
        }
      }
    }
  }

  if (input.district_id !== 0) {
    loop_distrists(input.district_id)
  } else {
    for (let district_id = 1; district_id <= 22; district_id++) {
      loop_distrists(district_id)
    }
  }

  function toQueryOutput(counter: Counters): QueryOutput {
    const results: QueryOutput['items'] = []
    for (let district_id in counter) {
      for (let month in counter[district_id]) {
        for (let day in counter[district_id][month]) {
          const total = counter[district_id][month][day].total
          const count = counter[district_id][month][day].count
          const average = total > 0 ? total / count : 0
          results.push({
            month: parseInt(month),
            day: parseInt(day),
            total: total,
            count: count,
            average: average,
          })
        }
      }
    }
    return { items: results }
  }

  return toQueryOutput(counters)
}

// get time id from database
function getTimeId(hour: number, minute: number): number | undefined {
  const timeRecord = filter(proxy.time, { hour, minute })[0]
  return timeRecord?.id || undefined
}

// get time ids in range from database
function getTimeIdsInRange(
  start_hour: number,
  end_hour: number,
  start_minute: number,
  end_minute: number,
): number[] {
  const start_time_id = getTimeId(start_hour, start_minute)
  const end_time_id = getTimeId(end_hour, end_minute)
  if (start_time_id === undefined || end_time_id === undefined) {
    return []
  }

  const time_ids: number[] = []
  for (let id = start_time_id; id <= end_time_id; id++) {
    time_ids.push(id)
  }

  return time_ids
}

// split time ids arrcoding to time mode
// e.g. if time mode is 2 hrs, each object 8 time slots
export function getTimeIdsInRangeByTimeMode(
  time_ids: number[],
  time_mode: '15mins' | '2hrs' | '12hrs' | '24hrs',
) {
  // return object array {time_ids: number[]}[]
  // {}.length = index size calculated by time range / time mode
  /*
  const time_ids = getTimeIdsInRange(
    start_hour,
    end_hour,
    start_minute,
    end_minute,
  )
  */
  const result: { time_ids: number[] }[] = []
  let index_size: number
  let arr_length: number
  switch (time_mode) {
    case '15mins':
      arr_length = 1
      index_size = time_ids.length // records store rainfall in every 15 mins
      break
    case '2hrs':
      arr_length = 8
      index_size = time_ids.length / 8 // 8 records in 2hrs
      break
    case '12hrs':
      arr_length = 48
      index_size = time_ids.length / 48 // 48 records in 12hrs
      break
    case '24hrs':
      return { time_ids: time_ids }
    default:
      throw new Error('invalid time mode: ' + time_mode)
  }

  for (let i = 0; i < index_size; i++) {
    result.push({
      time_ids: time_ids.slice(i * arr_length, arr_length * (i + 1)),
    })
  }
  return result
}

function isValidDate(year: number, month: number, day: number): boolean {
  // month is 0-indexed in Date constructor, so subtract 1
  const date = new Date(year, month - 1, day)

  // Check if the date is valid by comparing with input
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}
