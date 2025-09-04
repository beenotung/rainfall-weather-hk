import { Calendar } from '@fullcalendar/core'
import multiMonthPlugin from '@fullcalendar/multimonth'
import { Event } from './types'
import type { QueryInput, QueryOutput, QueryOutput_time_mode } from './api'

let query_result //Pre-declare a variable to store the result of db query
let calendar: Calendar | null = null
const input = document.querySelector('#user_input_form') as HTMLFormElement
let current_view_year = new Date().getFullYear()

async function main() {
  let res = await fetch('/data')
  let json = await res.json()
  const calendarEl = document.getElementById('calendar')
  calendar = new Calendar(calendarEl!, {
    plugins: [multiMonthPlugin],
    initialView: 'multiMonthYear',
    initialDate: `${current_view_year}-01-01`,
    // headerToolbar: false, // Hide navigation
    footerToolbar: false, // Hide navigation
    editable: false, // Prevent event editing
    selectable: false,
    events: [],
    headerToolbar: {
      left: '',
      center: 'title',
      right: '',
    },
  })
  calendar.render()
}

function compareRange(start: number, end: number): boolean {
  if (start > end) {
    return false
  }
  return true
}

function compareYearRange(start_year: number, end_year: number): boolean {
  if (!compareRange(start_year, end_year)) {
    alert('Start year cannot be greater than end year')
    return false
  }

  return true
}

function compareDayRange(start: number, end: number): boolean {
  if (!compareRange(start, end)) {
    alert('Start day cannot be greater than end day')
    return false
  }
  return true
}

function compareTime(
  start_hour: number,
  start_minute: number,
  end_hour: number,
  end_minute: number,
): boolean {
  if (!compareRange(start_hour, end_hour)) {
    alert('Start hour cannot be smaller than end hour')
    return false
  }
  if (start_hour === end_hour && !compareRange(start_minute, end_minute)) {
    alert('Start minute cannot be smaller than end minute')
    return false
  }
  return true
}

//Function to format date to "YYYY-MM-DD" format
function formatDate(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  console.log(year)
  return `${year}-${mm}-${dd}`
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
    /*
    console.log('Item:', item)
    console.log(
      'Month:',
      item.month,
      'Day:',
      item.day,
      'Average:',
      item.average,
    )
      */

    const event: Event = {
      id: `${i}`,
      title: `${item.average.toFixed(2)}mm`,
      start: formatDate(current_view_year, item.month, item.day),
    }

    console.log('Created event:', event)
    calendar?.addEvent(event)
  }
  calendar?.render()
}

function new_event_creator(
  query_result: QueryOutput_time_mode['rainfall_events'],
) {
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
    console.log('Start:', item.start, 'End:', item.end, 'AllDay:', item.allDay)

    if (item.allDay) {
      const event: Event = {
        id: `${i}`,
        title: `${item.average.toFixed(2)}mm`,
        start: item.start,
        //allDay: true,
      }
    } else {
      const event: Event = {
        id: `${i}`,
        title: `${item.average.toFixed(2)}mm`,
        start: item.start,
        end: item.end,
      }
    }

    const event: Event = {
      id: `${i}`,
      title: `${item.average.toFixed(2)}mm`,
      start: formatDate(current_view_year, item.month, item.day),
    }
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

  const start_year = document.querySelector('#start_year') as HTMLSelectElement
  const end_year = document.querySelector('#end_year') as HTMLSelectElement

  const view_year = document.querySelector(
    'input[name="view_year"]',
  ) as HTMLInputElement

  current_view_year = +view_year.value

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
  const monthes_ele = document.querySelectorAll(
    'input[name="selected_months"]:checked',
  ) as NodeListOf<HTMLInputElement>

  // if no month is selected, select all months
  let monthes = []
  if (monthes_ele.length === 0) {
    monthes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  } else {
    monthes = Array.from(monthes_ele)
      .filter(input => input.checked)
      .map(input => +input.value)
  }

  const start_day = document.querySelector(
    'input[name="start_day"]',
  ) as HTMLInputElement
  const end_day = document.querySelector(
    'input[name="end_day"]',
  ) as HTMLInputElement

  // Select Gregorian/Chinese date option
  const date_mode = document.querySelector(
    'input[name="date_mode"]:checked',
  ) as HTMLInputElement

  const time_mode = document.querySelector(
    '#time_mode_input',
  ) as HTMLSelectElement

  if (
    compareYearRange(+start_year.value, +end_year.value) &&
    compareTime(
      +start_hour.value,
      +start_minute.value,
      +end_hour.value,
      +end_minute.value,
    ) &&
    compareDayRange(+start_day.value, +end_day.value)
  ) {
    const input: QueryInput = {
      district_id: +district.value,

      start_year: +start_year.value,
      end_year: +end_year.value,

      view_year: +view_year.value,

      monthes: monthes,

      start_day: +start_day.value,
      end_day: +end_day.value,

      start_hour: +start_hour.value,
      end_hour: +end_hour.value,

      start_minute: +start_minute.value,
      end_minute: +end_minute.value,

      date_mode: date_mode.value as 'gregorian_date' | 'chinese_date',

      time_mode: time_mode.value as '15mins' | '2hrs' | '12hrs' | '24hrs',
    }

    fetch('query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
      .then(response => response.json())
      .then((data: QueryOutput) => {
        console.log('Server response:', data)

        //update calender, calender should show date with view year
        //updateCalender()

        //calendar?.render()
        // Handle rainfall data (required)
        if (data.items) {
          calendar?.gotoDate(`${current_view_year}-01-01`)
          console.log('Rainfall data:', data.items)
          event_creator(data.items)
        }
      })
      .catch(error => {
        console.error('Error fetching data:', error)
      })
  }
})

document.addEventListener('DOMContentLoaded', () => {
  main()
})
