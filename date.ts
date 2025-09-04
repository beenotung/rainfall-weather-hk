import { CalendarChinese } from 'date-chinese'

// TODO check if the input output are correct range
export function to_chinese_date(input: {
  /** e.g. 2025 */
  year: number
  /** e.g. 1 to 12 */
  month: number
  /** e.g. 1 to 31 */
  day: number
}) {
  let cal = new CalendarChinese()
  cal.fromGregorian(input.year, input.month, input.day)
  let [cycle, year, month, leap, day] = cal.get()
  return { cycle, year, month, leap, day }
}

// export function from_chinese_date(input: {}) {}
