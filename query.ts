import { QueryInput, QueryOutput } from './api'
import { to_chinese_date } from './date'
import { proxy } from './proxy'
import { filter } from 'better-sqlite3-proxy'

// time mode: 15min | 2hrs | 12 hrs | 24hrs
// average in every 15mins(every record) |
// 2hrs (8 records) | 12hrs (48 records) | 24hrs (full day)

// district -> month -> day (time aggregated within the query)
type Counters = {
  [district_id: number]: {
    [month: number]: {
      [day: number]: {
        [time_index: number]: CounterItem
      }
    }
  }
}

type CounterItem = {
  // total amount of rainfall
  total: number
  // how many records in time index
  count: number
}

// identify what time ids in a time slots
// arrcoding to select time range and time mode
type TimeSlot = {
  time_ids: number[]
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
    time_index: number,
  ) {
    if (input.date_mode === 'chinese_date') {
      let chinese_date = to_chinese_date({ year, month, day })
      month = chinese_date.month
      day = chinese_date.day
    }

    counters[district_id] ??= {}
    counters[district_id][month] ??= {}
    counters[district_id][month][day] ??= {}
    counters[district_id][month][day][time_index] ??= { total: 0, count: 0 }
    return counters[district_id][month][day][time_index]
  }

  // get time ids in range for database query
  const times_ids = getTimeIdsInRange(
    input.start_hour,
    input.end_hour,
    input.start_minute,
    input.end_minute,
  )

  // time slots for (time ids in each slot)
  const time_slots = getTimeSlots(times_ids, input.time_mode)

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

      let time_index = 0
      for (let slot of time_slots) {
        let counter_item = get_counter(
          district_id,
          date.year,
          date.month,
          date.day,
          time_index,
        )

        for (let time_id of slot.time_ids) {
          //console.log(date_id, time_id, input.district_id)
          const row = search(input.district_id, date_id, time_id)
          if (row.length === 0) {
            continue
          } else {
            counter_item.total += row[0].amount
            counter_item.count++
          }
        }

        time_index++
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

  function toQueryOutput(): QueryOutput {
    const events: QueryOutput['rainfall_events'] = []

    // conters -> district_id -> month -> day -> time_index -> total, count
    for (let district_id in counters) {
      for (let month in counters[district_id]) {
        for (let day in counters[district_id][month]) {
          for (let time_index in counters[district_id][month][day]) {
            const total = counters[district_id][month][day][time_index].total
            const count = counters[district_id][month][day][time_index].count
            const average = total > 0 ? total / count : 0
            // get time ids use time_slots[time_index].time_ids[0] -> start time id
            const time_row = filter(proxy.time, {
              id: time_slots[time_index].time_ids[0],
            })
            const district_row = filter(proxy.district, {
              id: parseInt(district_id),
            })
            //console.log('time_id', time_slots[time_index].time_ids[0])
            const district_name = district_row[0].name
            const { start, end } = getEventTimeRange(
              input.view_year,
              parseInt(month),
              parseInt(day),
              time_row[0].hour,
              time_row[0].minute,
              input.time_mode,
            )
            if (input.time_mode === '24hrs') {
              events.push({
                district: district_name,
                month: parseInt(month),
                day: parseInt(day),
                average: average,
                start: start,
                allDay: true,
              })
            } else {
              events.push({
                district: district_name,
                month: parseInt(month),
                day: parseInt(day),
                average: average,
                start: start,
                end: end,
              })
            }
          }
        }
      }
    }
    // console.log('Events:', events)
    return { rainfall_events: events }
  }
  return toQueryOutput()
  // return toQueryOutput(counters)
}

// return object for event start and end time in string format
// Year = view_year
// YYYY-MM-DDTHH:MM
function getEventTimeRange(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  time_mode: '15mins' | '2hrs' | '12hrs' | '24hrs',
): { start: string; end: string } {
  // Use Date object, aims to handle time addiction
  // toISOString() always return UTC time
  // use Date.UTC() to create UTC time for calendar
  const start = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const start_string = start.toISOString().slice(0, 16)

  //console.log('start', start_string)

  let end
  switch (time_mode) {
    case '15mins':
      end = new Date(Date.UTC(year, month - 1, day, hour, minute + 15))
      break
    case '2hrs':
      end = new Date(Date.UTC(year, month - 1, day, hour, minute + 120))
      break
    case '12hrs':
      end = new Date(Date.UTC(year, month - 1, day, hour, minute + 720))
      break
    case '24hrs':
      end = new Date(Date.UTC(year, month - 1, day + 1, hour, minute))
      break
    default:
      throw new Error('invalid time mode: ' + time_mode)
  }

  const end_string = end.toISOString().slice(0, 16)
  return { start: start_string, end: end_string }
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
function getTimeSlots(
  time_ids: number[],
  time_mode: '15mins' | '2hrs' | '12hrs' | '24hrs',
): TimeSlot[] {
  // return object array {time_ids: number[]}[]
  // {}.length = index size calculated by time range / time mode

  const result: { time_ids: number[] }[] = []
  let arr_length: number
  switch (time_mode) {
    case '15mins':
      arr_length = 1 // records store rainfall in every 15 mins
      break
    case '2hrs':
      arr_length = 8
      break
    case '12hrs':
      arr_length = 48
      break
    case '24hrs':
      return [{ time_ids: time_ids }]
    default:
      throw new Error('invalid time mode: ' + time_mode)
  }

  // avoid decimal
  const index_size = Math.ceil(time_ids.length / arr_length)

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
