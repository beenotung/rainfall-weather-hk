/* This file contains Date conversion functions for the rainfall application */
import { CalendarChinese } from "date-chinese"


//Function to convert a string of date e.g. "10-01" to int month and day, e.g. [10, 1]
export function parseDate(date : string) {
  const [year, month, day] = date.split('-')
  return [parseInt(year, 10), parseInt(month, 10), parseInt(day, 10)]
}


//Function to convert gregorian date to chinese date
export function gregorian_to_chinese_date(date: string){
  const [year, month, day] = date.split('-').map(Number)
  let cal = new CalendarChinese()
  cal.fromGregorian(year, month, day)
  const [chinese_cycle, chinese_year, chinese_month, chinese_leap, chinese_day] = cal.get()
  return [chinese_cycle, chinese_year, chinese_leap] //Return Chinese cycle and year, then use it to convert by to Gregorian date
}


//Function to format date to "YYYY-MM-DD" format 
export function formatDate(year: number, month: number, day:number ) : string{
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}


//Function to format numbers
export function formatNumber(x: number) {
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


// Function to convert a Chinese date to a Gregorian date
export function chinese_date_convertor(date:string){
    const [year, month, day] = date.split('-')
    let [chinese_cycle, chinese_year, chinese_leap] =  gregorian_to_chinese_date(date)

    let cal = new CalendarChinese(chinese_cycle, chinese_year, parseInt(month, 10), chinese_leap, parseInt(day, 10))
    let chinese_date = cal.toGregorian(parseInt(year,10))

    // print chinese date for reference
    console.log("Chinese date (Gregorian):", chinese_date)

    let formatted_chinese_date = formatDate(chinese_date.year, chinese_date.month, chinese_date.day)

    return parseDate(formatted_chinese_date)
}