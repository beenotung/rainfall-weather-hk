import {
  parseHtmlDocument,
  walkNode,
  HTMLElement,
  getElementsByTagName,
  getElementByTagName,
} from '@beenotung/html-parser'
import { readFileSync, writeFileSync } from 'fs'
import { Date, proxy } from './proxy'
import { find } from 'better-sqlite3-proxy'
import { format_2_digit } from '@beenotung/tslib/format'
import { TimezoneDate } from 'timezone-date.ts'
import { db } from './db'

async function collectByRange(options: {
  first_date: string
  last_date: string
}) {
  let dateStr = options.last_date

  let date = new TimezoneDate()
  date.timezone = 0
  let parts = dateStr.split('-')
  let year = +parts[0]
  let month = +parts[1]
  let day = +parts[2]

  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)

  for (;;) {
    year = date.getFullYear()
    month = date.getMonth() + 1
    day = date.getDate()

    // TODO next day

    if (find(proxy.date, { year, month, day })) continue

    let dateStr = year + '-' + format_2_digit(month) + '-' + format_2_digit(day)
    let html = await downloadByDate(dateStr)
    storeByDate({
      date: {
        year,
        month,
        day,
        week_day: date.getDay(),
      },
      html,
    })
  }
}

async function downloadByDate(dateStr: string) {
  let url = `https://i-lens.hk/hkweather/hourly_rainfall_load.php?date=${dateStr}`
  let res = await fetch(url)
  let html = await res.text()
  return html
}

let storeByDate = db.transaction((options: { date: Date; html: string }) => {
  let date_id = proxy.date.push(options.date)
  let doc = parseHtmlDocument(options.html)
  let trList = getElementsByTagName(doc, 'tr')

  let headTr = trList[0]
  let headings = headTr.childNodes!.map(td => (td as HTMLElement).innerHTML)

  for (let i = 1; i < trList.length; i++) {
    let dataTr = trList[i]
    let time = getElementByTagName(dataTr.childNodes![0], 'a')!.innerHTML
    let time_id = getTimeId(time)
    for (let i = 1; i < headings.length; i++) {
      let amount = toAmount((dataTr.childNodes![i] as HTMLElement).innerHTML)
      let district_name = headings[i]
      let district_id = getDistrictId(district_name)
      find(proxy.rainfall, { date_id, time_id, district_id }) ||
        proxy.rainfall.push({ date_id, time_id, district_id, amount })
    }
  }
})

function toAmount(text: string): number {
  if (text == '-') return 0
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

  let parts = text.split(':')
  let hour = +parts[0]
  let minute = +parts[1]

  id =
    find(proxy.time, { hour, minute })?.id || proxy.time.push({ hour, minute })
  time_id_cache[text] = id
  return id
}

async function main() {
  await collectByRange({
    first_date: '2023-07-01',
    last_date: '2023-07-05',
  })
}
main().catch(e => console.error(e))
