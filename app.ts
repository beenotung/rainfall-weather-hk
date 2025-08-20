import { any } from '@beenotung/tslib'
import { Calendar } from '@fullcalendar/core'
import multiMonthPlugin from '@fullcalendar/multimonth'
import { response } from 'express'

let query_result //Pre-declare a variable to store the result of db query
const input = document.querySelector('#user_input_form') as HTMLFormElement
async function main() {
  let res = await fetch('/data')
  let json = await res.json()
  const calendarEl = document.getElementById('calendar')
  const calendar = new Calendar(calendarEl!, {
    plugins: [multiMonthPlugin],
    initialView: 'multiMonthYear',
    initialDate: '2024-01-01',
    headerToolbar: false,          // Hide navigation
    footerToolbar: false,          // Hide navigation
    editable: false,               // Prevent event editing
    selectable: false, 
  })

  calendar.render()
}

function compareDate(start_date : string, end_date : string) : boolean{
  let [start_month, start_day] = start_date.split('-') 
  let [end_month, end_day] = end_date.split('-') 
  
  if(parseInt(start_month, 10) > parseInt(end_month, 10)){
    alert("Start month cannot be smaller than end month")
    return false 
  }
  if(parseInt(start_month, 10) === parseInt(end_month, 10) && parseInt(start_day, 10) > parseInt(end_day, 10)){
    alert("Start day cannot be smaller than end day")
    return false 
  }
  return true
}

function compareTime(start_hour : string, start_minute:string, end_hour:string, end_minute:string):boolean{
  if(parseInt(start_hour, 10) > parseInt(end_hour, 10)){
    alert("Start hour cannot be smaller than end hour")
    return false
  }
  if(start_hour === end_hour && parseInt(start_minute, 10) > parseInt(end_minute, 10)){
    alert("Start minute cannot be smaller than end minute")
    return false
  }
  return true 
}

function event_creator(query_result : object[]){
  interface Event  { //Declare a event object
    id: number, 
    title: string,
    start: string
  }

  let events : Event[] = [] //Create a list of event 

  for(let i = 0; i < query_result.length; i++){
    const item = query_result[i] as any;
    const event : Event = {
      id: i,
      title: String(item.average_amount),
      start: `2024-${item.month}-${item.day}`
    }
    events.push(event)
  }
  return events
}

input.addEventListener('submit', (event) => {
  //Prevent refresh
  event?.preventDefault()
  
  const district = document.querySelector('#district_input') as HTMLSelectElement;
  const start_date = document.querySelector('#start_date_input') as HTMLInputElement;
  const end_date = document.querySelector('#end_date_input') as HTMLInputElement;
  const start_hour = document.querySelector('#start_hour_input') as HTMLSelectElement;
  const start_minute = document.querySelector('#start_minute_input') as HTMLSelectElement;
  const end_hour = document.querySelector('#end_hour_input') as HTMLSelectElement;
  const end_minute = document.querySelector('#end_minute_input') as HTMLSelectElement;
  const gregorian_chinese_date = document.querySelector('input[name="gregorian_chinese_option"]:checked') as HTMLInputElement
  
  if( compareDate(start_date.value, end_date.value) 
    && compareTime(start_hour.value, start_minute.value, end_hour.value, end_minute.value) ){

    const data = {
      district: district.value,
      start_date: start_date.value,
      end_date: end_date.value,
      start_hour: start_hour.value,
      start_minute: start_minute.value,
      end_hour: end_hour.value,
      end_minute: end_minute.value,
      gregorian_chinese: gregorian_chinese_date.value
    }
  
    fetch('submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => response.json())
      .then(data => {query_result = data.query_result;});
  }
});

document.addEventListener('DOMContentLoaded', () => {
  main();
});
