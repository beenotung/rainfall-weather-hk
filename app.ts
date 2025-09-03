import { Calendar } from '@fullcalendar/core'
import multiMonthPlugin from '@fullcalendar/multimonth'
import { Event } from './types'
import type { QueryInput, QueryOutput } from './api'

let query_result //Pre-declare a variable to store the result of db query
let calendar: Calendar | null = null
const input = document.querySelector('#user_input_form') as HTMLFormElement

async function main() {
  let res = await fetch('/data')
  let json = await res.json()
  const calendarEl = document.getElementById('calendar')
  calendar = new Calendar(calendarEl!, {
    plugins: [multiMonthPlugin],
    initialView: 'multiMonthYear',
    initialDate: '2024-01-01',
    headerToolbar: false, // Hide navigation
    footerToolbar: false, // Hide navigation
    editable: false, // Prevent event editing
    selectable: false,
    events: [],
  })
  calendar.render()
}

function compareYear(start_year: string, end_year: string): boolean {
  if (parseInt(start_year, 10) > parseInt(end_year, 10)) {
    alert('Start year cannot be greater than end year')
    return false
  }
  return true
}

function compareDate(start_date: string, end_date: string): boolean {
  let [start_month, start_day] = start_date.split('-')
  let [end_month, end_day] = end_date.split('-')

  if (parseInt(start_month, 10) > parseInt(end_month, 10)) {
    alert('Start month cannot be smaller than end month')
    return false
  }
  if (
    parseInt(start_month, 10) === parseInt(end_month, 10) &&
    parseInt(start_day, 10) > parseInt(end_day, 10)
  ) {
    alert('Start day cannot be smaller than end day')
    return false
  }
  return true
}

function compareTime(
  start_hour: string,
  start_minute: string,
  end_hour: string,
  end_minute: string,
): boolean {
  if (parseInt(start_hour, 10) > parseInt(end_hour, 10)) {
    alert('Start hour cannot be smaller than end hour')
    return false
  }
  if (
    start_hour === end_hour &&
    parseInt(start_minute, 10) > parseInt(end_minute, 10)
  ) {
    alert('Start minute cannot be smaller than end minute')
    return false
  }
  return true
}

//Function to format date to "YYYY-MM-DD" format
function formatDate(month: number, day: number) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `2024-${mm}-${dd}`
}

//Take the query_result
/*{
    month: number,
    day: number,
    total: number,
    count: number,
    average: number
  }
*/
//And parse it to a event object
//Then render it
function event_creator(query_result: QueryOutput['items']) {
  //Remove all previous event
  calendar?.removeAllEvents()
  console.log('Raw query_result:', query_result)
  console.log('Query result type:', typeof query_result)
  console.log('Is array:', Array.isArray(query_result))

  for (let i = 0; i < query_result.length; i++) {
    const item = query_result[i]
    console.log('Item:', item)
    console.log(
      'Month:',
      item.month,
      'Day:',
      item.day,
      'Average:',
      item.average,
    )

    const event: Event = {
      id: `${i}`,
      title: `${item.average}mm`,
      start: formatDate(item.month, item.day),
    }

    console.log('Created event:', event)
    calendar?.addEvent(event)
  }
  calendar?.render()
}
/*
//Function to create events for Chinese calendar data
function event_creator_chinese(chinese_data : object[]){
  console.log("Creating Chinese calendar events:", chinese_data)
  console.log("Chinese data type:", typeof chinese_data)
  console.log("Is array:", Array.isArray(chinese_data))

  for(let i = 0; i < chinese_data.length; i++){
    const item = chinese_data[i] as any;
    console.log("Chinese item:", item)
    
    // Create event for Chinese calendar data
    // You can customize this based on your Chinese data structure
    const event = {
      id: `chinese_${i}`,
      title: `🏮 ${item.title || 'Chinese Event'}`, // Adding Chinese emoji for distinction
      start: item.start || formatDate(item.month, item.day), // Adjust based on your data structure
      color: '#ff6b6b', // Different color for Chinese events
      textColor: '#ffffff',
      extendedProps: {
        type: 'chinese'
      }
    }
    
    console.log("Created Chinese event:", event)
    calendar?.addEvent(event)
  }
  calendar?.render()
  
}
*/

input.addEventListener('submit', event => {
  //Prevent refresh
  event?.preventDefault()

  // Rain fall data range
  const district = document.querySelector(
    '#district_input',
  ) as HTMLSelectElement
  //const start_date = document.querySelector('#start_date_input') as HTMLInputElement;
  //const end_date = document.querySelector('#end_date_input') as HTMLInputElement;

  const start_year = document.querySelector('#start_year') as HTMLSelectElement
  const end_year = document.querySelector('#end_year') as HTMLSelectElement

  const start_hour = document.querySelector(
    '#start_hour_input',
  ) as HTMLSelectElement
  const start_minute = document.querySelector(
    '#start_minute_input',
  ) as HTMLSelectElement
  const end_hour = document.querySelector(
    '#end_hour_input',
  ) as HTMLSelectElement
  const end_minute = document.querySelector(
    '#end_minute_input',
  ) as HTMLSelectElement

  // Selected range to show
  const selected_months_ele = document.querySelectorAll(
    'input[name="selected_months"]:checked',
  ) as NodeListOf<HTMLInputElement>

  const selected_months = Array.from(selected_months_ele)
    .filter(input => input.checked)
    .map(input => +input.value)

  const selected_start_day = document.querySelector(
    'input[name="selected_start_day"]',
  ) as HTMLInputElement
  const selected_end_day = document.querySelector(
    'input[name="selected_end_day"]',
  ) as HTMLInputElement

  // Select Gregorian/Chinese date option
  const date_mode = document.querySelector(
    'input[name="date_mode"]:checked',
  ) as HTMLInputElement

  console.log(selected_months)
  console.log(selected_end_day)
  console.log(selected_start_day)

  if (
    compareYear(start_year.value, end_year.value) &&
    compareTime(
      start_hour.value,
      start_minute.value,
      end_hour.value,
      end_minute.value,
    )
  ) {
    const input: QueryInput = {
      district_id: +district.value,

      start_year: +start_year.value,
      end_year: +end_year.value,

      monthes: selected_months,

      start_day: +selected_start_day.value,
      end_day: +selected_end_day.value,

      start_hour: +start_hour.value,
      end_hour: +end_hour.value,

      start_minute: +start_minute.value,
      end_minute: +end_minute.value,

      date_mode: date_mode.value as 'gregorian_date' | 'chinese_date',
    }

    fetch('submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
      .then(response => response.json())
      .then((data: QueryOutput) => {
        console.log('Server response:', data)

        // Handle rainfall data (required)
        if (data.items) {
          console.log('Rainfall data:', data.items)
          event_creator(data.items)
        }

        /*
        // Handle Chinese data (optional)
        if (data.chinese_data) {
          console.log("Chinese data:", data.chinese_data);
          event_creator_chinese(data.chinese_data);
        }
        */
      })
      .catch(error => {
        console.error('Error fetching data:', error)
      })
  }
})

document.addEventListener('DOMContentLoaded', () => {
  main()
})
