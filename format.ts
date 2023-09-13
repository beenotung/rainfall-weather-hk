import { format_2_digit } from '@beenotung/tslib/format'
import { TimezoneDate } from 'timezone-date.ts'

export function toDateStr(year: number, month: number, day: number): string {
  return year + '-' + format_2_digit(month) + '-' + format_2_digit(day)
}

export function parseDate(text: string) {
  let parts = text.split('-')
  let year = +parts[0]
  let month = +parts[1]
  let day = +parts[2]
  let date = new TimezoneDate()
  date.timezone = 8
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month - 1, day)
  return date
}

export function parseTime(text: string) {
  let parts = text.split(':')

  if (parts[0] && parts[1]) {
    return {
      hour: +parts[0],
      minute: +parts[1],
    }
  }

  throw new Error(`Invalid time: ${text}`)
}
