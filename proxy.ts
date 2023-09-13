import { proxySchema } from 'better-sqlite3-proxy'
import { db } from './db'

export type Date = {
  id?: null | number
  year: number
  month: number
  day: number
  week_day: number
}

export type District = {
  id?: null | number
  name: string
}

export type Time = {
  id?: null | number
  hour: number
  minute: number
}

export type Rainfall = {
  id?: null | number
  date_id: number
  date?: Date
  time_id: number
  time?: Time
  district_id: number
  district?: District
  amount: number
}

export type DBProxy = {
  date: Date[]
  district: District[]
  time: Time[]
  rainfall: Rainfall[]
}

export let proxy = proxySchema<DBProxy>({
  db,
  tableFields: {
    date: [],
    district: [],
    time: [],
    rainfall: [
      /* foreign references */
      ['date', { field: 'date_id', table: 'date' }],
      ['time', { field: 'time_id', table: 'time' }],
      ['district', { field: 'district_id', table: 'district' }],
    ],
  },
})
