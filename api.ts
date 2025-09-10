export type QueryInput = {
  // 0 for all, otherwise a specific district id matching the DB
  district_id: number[]

  // for statics
  start_year: number
  end_year: number

  // for display
  view_year: number

  // 1 to 12
  months: number[]

  // 1 to 31
  start_day: number
  end_day: number

  // 0 to 23
  start_hour: number
  end_hour: number

  // 0 to 45
  start_minute: number
  end_minute: number

  date_mode: 'gregorian_date' | 'chinese_date'
  time_mode: '15mins' | '2hrs' | '12hrs' | '24hrs'
}

export type QueryOutput = {
  // data for average rainfall per slot
  // needs: month, day rainfall mount(no total/count need), start time
  // allDay? if time_mode = 24hrs event option allDay = true
  rainfall_events: {
    district: string
    month: number
    day: number
    average: number
    // 0: no rain, 1: weak, 2: moderate, 3: strong, 4: extreme
    strength: 0 | 1 | 2 | 3 | 4
    start: string // if time mode = 24hrs, start is not needed
    end?: string // if time mode = 24hrs, end is not needed
    allDay?: boolean // if time mode = 24hrs, allDay is true
  }[]
}
