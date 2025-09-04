export type QueryInput = {
  // 0 for all, otherwise a specific district id matching the DB
  district_id: number

  // for statitcs
  start_year: number
  end_year: number

  // for display
  view_year: number

  // 1 to 12
  monthes: number[]

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
  // not implemented
  time_mode: '15mins' | '2hrs' | '12hrs' | '24hrs'
}

export type QueryOutput = {
  items: {
    month: number
    day: number
    total: number
    count: number
    average: number
  }[]
}

export type QueryOutput_time_mode = {
  // data for average rainfall per slot
  // needs: month, day rainfall mount(no total/count need), start time
  // allDay? if timemode = 24hrs event option allDay = true
  rainfall_events: {
    month: number
    day: number
    average: number
    start: string // if time mode = 24hrs, start is not needed
    end?: string // if time mode = 24hrs, end is not needed
    allDay?: boolean // if time mode = 24hrs, allDay is true
  }[]
}
