import {
  parseHtmlDocument,
  HTMLElement,
  getElementsByTagName,
} from '@beenotung/html-parser'
import { Date, proxy } from './proxy'
import { find } from 'better-sqlite3-proxy'
import { DAY } from '@beenotung/tslib/time'
import { db } from './db'
import { parseDate, parseTime, toDateStr } from './format'
import { format_time_duration } from '@beenotung/tslib/format'
import debug from 'debug'

// let log = debug('collect.ts')
// log.enabled = true

async function collectByRange(options: {
  first_date: string
  last_date: string
}) {
  let dateStr = options.last_date

  let date = parseDate(dateStr)

  let totalDayCount =
    (parseDate(options.last_date).getTime() -
      parseDate(options.first_date).getTime()) /
      DAY +
    1
  let collectedDayCount = 0
  let startTime = Date.now()
  for (let i = 0; i < totalDayCount; i++) {
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let day = date.getDate()

    if (!find(proxy.date, { year, month, day })) {
      dateStr = toDateStr(year, month, day)
      // log('found new ' + dateStr)
      let html = await downloadByDate(dateStr)
      // log('downloaded ' + dateStr)
      storeByDate({
        date: {
          year,
          month,
          day,
          week_day: date.getDay(),
        },
        html,
      })
      // log('stored ' + dateStr)
      collectedDayCount++
      let passedTime = Date.now() - startTime
      let remainDayCount = totalDayCount - i - 1
      let timePerDay = passedTime / collectedDayCount
      let remainTime = remainDayCount * timePerDay
      let remainTimeStr = format_time_duration(remainTime, 1)
      if (!remainTimeStr.includes('.')) {
        remainTimeStr = remainTimeStr.replace(' ', '.0 ')
      }
      // console.log()
      process.stdout.write(
        `\r  [progress]` +
          ` | collected: ${i + 1}/${totalDayCount} days` +
          ` | ETA: ${remainTimeStr}` +
          // ` | time per day: ${timePerDay.toFixed(1)} ms` +
          ` | ${options.first_date} < ${dateStr} > ${options.last_date}`,
      )
    }
    date.setTime(date.getTime() - DAY)
  }
  console.log()
}

async function downloadByDate(dateStr: string) {
  let url = `https://i-lens.hk/hkweather/hourly_rainfall_load.php?date=${dateStr}`
  let res = await fetch(url)
  let html = await res.text()
  return html
}

let storeByDate = db.transaction((options: { date: Date; html: string }) => {
  let date_id = proxy.date.push(options.date)
  // log('pushed date ' + date_id)
  let doc = parseHtmlDocument(options.html)
  // log('parsed html ' + options.html.length)
  let trList = getElementsByTagName(doc, 'tr')

  let headTr = trList[0]
  let headings = headTr.childNodes!.map(td => (td as HTMLElement).innerHTML)

  for (let i = 1; i < trList.length; i++) {
    let dataTr = trList[i]
    dataTr.childNodes![0]
    let time = getTime(dataTr.childNodes![0] as HTMLElement)
    let time_id = getTimeId(time)
    for (let i = 1; i < headings.length; i++) {
      let amount = parseAmount((dataTr.childNodes![i] as HTMLElement).innerHTML)
      if (amount == null) continue
      let district_name = headings[i]
      let district_id = getDistrictId(district_name)
      find(proxy.rainfall, { date_id, time_id, district_id }) ||
        proxy.rainfall.push({ date_id, time_id, district_id, amount })
    }
  }
  // log('looped times ' + (trList.length - 1))
})

function getTime(td: HTMLElement): string {
  let child = td.childNodes![0]
  if (child instanceof HTMLElement) {
    return child.innerHTML
  }
  return child.outerHTML
}

function parseAmount(text: string): null | number {
  if (text == 'M') return null
  if (text == '-') return 0
  if (text == '') return 0
  let number = +text
  if (number) return number
  throw new Error('invalid amount: ' + JSON.stringify(text))
}

let district_id_cache: Record<string, number> = {}

function getDistrictId(name: string): number {
  let id = district_id_cache[name]
  if (id) return id

  id = find(proxy.district, { name })?.id || proxy.district.push({ name })
  district_id_cache[name] = id
  return id
}

let time_id_cache: Record<string, number> = {}

function getTimeId(text: string): number {
  let id = time_id_cache[text]
  if (id) return id

  let { hour, minute } = parseTime(text)

  id =
    find(proxy.time, { hour, minute })?.id || proxy.time.push({ hour, minute })
  time_id_cache[text] = id
  return id
}

async function main() {
  let date = new Date(Date.now() - 7 * DAY)
  let last_date = toDateStr(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  )
  last_date = '2023-07-31'
  let first_date = '2002-04-06'
  await collectByRange({ first_date, last_date })
}
main().catch(e => console.error(e))
