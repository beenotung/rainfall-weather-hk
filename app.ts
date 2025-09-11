import { Calendar, EventInput } from '@fullcalendar/core'
import multiMonthPlugin from '@fullcalendar/multimonth'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import type { QueryInput, QueryOutput } from './api'

let calendar: Calendar | null = null
const input = document.querySelector('#user_input_form') as HTMLFormElement
// loading spinner for waiting data from server
let isLoading = false
// processing spinner for creating rainfall events
let isCreating = false

async function main() {
  const current_date = new Date()
  const init_date = current_date.toISOString().slice(0, 10)
  let res = await fetch('/data')
  let json = await res.json()
  const calendarEl = document.getElementById('calendar')
  calendar = new Calendar(calendarEl!, {
    plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin],
    initialView: 'dayGridMonth',
    initialDate: init_date,
    footerToolbar: false, // Hide navigation
    editable: false, // Prevent event editing
    selectable: false,
    eventOverlap: false,
    eventTextColor: '#000000',
    eventDisplay: 'block',
    events: [],
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'multiMonthYear,dayGridMonth,timeGridWeek',
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

// show loading spinner
// disable submit button
function showLoading() {
  isLoading = true
  const loading_container = document.getElementById('loading_container')
  const form = document.getElementById('user_input_form') as HTMLFormElement

  if (loading_container) {
    loading_container.style.display = 'flex'
  }

  if (form) {
    form.style.display = 'none'
  }
}

// hide loading spinner
// enable submit button -> allow submit again
function hideLoading() {
  isLoading = false
  const loading_container = document.getElementById('loading_container')
  const form = document.getElementById('user_input_form') as HTMLFormElement

  if (loading_container) {
    loading_container.style.display = 'none'
  }

  if (form) {
    form.style.display = 'grid'
  }
}

function getBgColor(strength: 0 | 1 | 2 | 3 | 4): string {
  switch (strength) {
    case 0:
      return '#d9effe'
    case 1:
      return '#4fcff9'
    case 2:
      return '#56f959'
    case 3:
      return '#ded855'
    case 4:
      return '#e9994c'
  }
}

function event_creator(query_output: QueryOutput['rainfall_events']) {
  calendar?.removeAllEvents()
  console.log('Raw query_result:', query_output)
  console.log('Query result type:', typeof query_output)
  console.log('Is array:', Array.isArray(query_output))
  console.log('Query output length:', query_output.length)

  const total_events = query_output.length
  let current_event = 0

  for (let i = 0; i < total_events; i++) {
    const item = query_output[i]
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

    const event: EventInput = {
      id: `${i}`,
      title: `${item.average.toFixed(2)}mm ${item.district} `,
      start: item.start,

      ...(item.end && { end: item.end }),

      // Add allDay flag if available
      ...(item.allDay !== undefined && { allDay: item.allDay }),
      color: getBgColor(item.strength),
    }
    //console.log('Start:', item.start, 'End:', item.end, 'AllDay:', item.allDay)
    calendar?.addEvent(event)
    if (i === 0) {
      calendar?.gotoDate(item.start)
    }
    current_event++
    if (i % 10 === 0 || i === total_events - 1) {
      const progress = (current_event / total_events) * 100
      console.log(
        `Processing events: ${current_event}/${total_events} (${progress.toFixed(
          1,
        )}%)`,
      )
    }
  }
  calendar?.render()
}

input.addEventListener('submit', event => {
  //Prevent refresh
  event?.preventDefault()

  // Rain fall data range
  if (isLoading || isCreating) {
    return
  }

  const districts_ele = document.querySelectorAll(
    'input[name="selected_districts"]:checked',
  ) as NodeListOf<HTMLInputElement>

  let districts = []
  if (districts_ele.length === 0) {
    districts = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22,
    ]
  } else {
    districts = Array.from(districts_ele)
      .filter(input => input.checked)
      .map(input => +input.value)
  }

  const start_year = document.querySelector('#start_year') as HTMLSelectElement
  const end_year = document.querySelector('#end_year') as HTMLSelectElement

  const view_year = document.querySelector(
    'input[name="view_year"]',
  ) as HTMLInputElement

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
  const months_ele = document.querySelectorAll(
    'input[name="selected_months"]:checked',
  ) as NodeListOf<HTMLInputElement>

  // if no month is selected, select all months
  let months = []
  if (months_ele.length === 0) {
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  } else {
    months = Array.from(months_ele)
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
      district_id: districts,

      start_year: +start_year.value,
      end_year: +end_year.value,

      view_year: +view_year.value,

      months: months,

      start_day: +start_day.value,
      end_day: +end_day.value,

      start_hour: +start_hour.value,
      end_hour: +end_hour.value,

      start_minute: +start_minute.value,
      end_minute: +end_minute.value,

      date_mode: date_mode.value as 'gregorian_date' | 'chinese_date',

      time_mode: time_mode.value as '15mins' | '2hrs' | '12hrs' | '24hrs',
    }

    showLoading()

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
        console.log('Received data at:' + new Date())

        // Handle rainfall data (required)
        if (data.rainfall_events) {
          if (data.rainfall_events.length === 0) {
            alert('No rainfall data found, \nLatest data is 2023-7-31')
            hideLoading()
            return
          }
          console.log('Rainfall data:', data.rainfall_events)
          event_creator(data.rainfall_events)
          console.log('Event created at:' + new Date())
          hideLoading()
        }
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        hideLoading()
        alert('Error fetching data, please try again')
      })
  }
})

document.addEventListener('DOMContentLoaded', () => {
  main()
})
