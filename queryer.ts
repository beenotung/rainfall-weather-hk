import * as stats from './stats'

/*

todo: 
1. get rainfall data from stats.ts, according to provided parameters (post request)
2. analyze the retrieved data i.e. calculate average rainfall
3. convert analyzed data into desired format (chinese/gregorian date)
4. generate json format for rainfall data -> return -> response

*/

type RequestData = {
    years: [number, number],
    months: number[],
    days: [number, number],
    hour: [number, number],
    minute: [number, number],
    district_id: number,
    chinese_date: boolean
}




export function get_average_rainfall_from_request(req_data: any){

    // init step, reset counter
    stats.reset_counters

    // step 1, split data from request
    const data = split_data(req_data)

    // step 2, change stats date mode
    stats.set_data_mode(data.chinese_date)

    // step 3, get data from stats (counters)
    const rainfall = get_counter_by_data(data)

    // step 4, calculate average rainfall




    return rainfall

}


export function split_data(data: any) : RequestData {
    let district
    if (data['district'] === 'All'){
        district = 0;
    }
    else{
        district = parseInt(data['district']);
    }
    let months
    if (data['selected_months'].length === 0) {
        months = []
    }
    else{
        months = data['selected_months'].map((m: string) => parseInt(m));
    }

    return {
        years: [parseInt(data['start_year']), parseInt(data['end_year'])],
        months: months,
        days: [parseInt(data['selected_start_day']), parseInt(data['selected_end_day'])],
        hour: [parseInt(data['start_hour']), parseInt(data['end_hour'])],
        minute: [parseInt(data['start_minute']), parseInt(data['end_minute'])],
        district_id: district,
        chinese_date: data['gregorian_chinese'] === 'chinese_date'
    }
} 

function get_counter_by_data(data: RequestData) {
    stats.onYearRange(data.years, data.months, data.days, data.hour, data.minute, data.district_id);
    return stats.get_counters();
}