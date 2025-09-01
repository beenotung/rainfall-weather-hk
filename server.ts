import express from 'express'
import { print } from 'listening-on'
import { proxy } from './proxy'
import { db } from './db'
import { CalendarChinese } from 'date-chinese'
import { number } from '@beenotung/tslib'
import { parseDate, chinese_date_convertor } from './convertor'
import { rainfall_sum } from './query_handler'



let app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/data', (req, res) => {
  res.json({ dates: proxy.date.length })
})

let port = 8100
app.listen(port, () => {
  print(port)
})

app.post('/submit', async (req, res) => {
  try {
    // req.body contains the JSON sent from the client
    console.log('Received data:', req.body);  

    const district = req.body['district'];
    const start_date = req.body['start_date'];
    const end_date = req.body['end_date'];
    const start_hour = req.body['start_hour'];
    const start_minute = req.body['start_minute'];
    const end_hour = req.body['end_hour'];
    const end_minute = req.body['end_minute'];
    const gregorian_chinese = req.body['gregorian_chinese'];
    let start_year, start_month, start_day
    let end_year, end_month, end_day

    if(gregorian_chinese === 'gregorian_date'){
      [start_year, start_month, start_day] = parseDate(start_date);
      [end_year, end_month, end_day] = parseDate(end_date);
    }else{
      [start_year, start_month, start_day] = chinese_date_convertor(start_date);
      [end_year, end_month, end_day] = chinese_date_convertor(end_date);
    }

    // Await the async rainfall_sum function
    let query_result = await rainfall_sum({
      district,
      start_year,
      end_year,
      start_month,
      start_day,
      end_month,
      end_day,
      start_hour,
      start_minute,
      end_hour,
      end_minute
    });

    console.log(query_result)
    
    // Send a response back to the client
    res.json({ query_result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
