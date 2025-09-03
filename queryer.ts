import * as stats from './stats'

/*

todo: 
1. get rainfall data from stats.ts, according to provided parameters (post request)
2. analyze the retrieved data i.e. calculate average rainfall
3. convert analyzed data into desired format (chinese/gregorian date)
4. generate json format for rainfall data -> return -> response

*/

type QueryOption = {
    years: [number, number],
    months: number[],
    days: [number, number],
    hour: [number, number],
    minute: [number, number],
    district_id: number,
    chinese_date: boolean
}

// return object for rainfall data
type ReturnData = {
    month: number,
    day: number,
    total: number, 
    count: number,
    average: number
}


export function get_average_rainfall_from_request(req_data: any){

    // init step, reset counter
    stats.reset_counters()

    // step 1, split data from request
    const data = split_data(req_data)

    // step 2, change stats date mode
    stats.set_data_mode(data.chinese_date)

    // step 3, get data from stats (counters)
    const rainfall = get_counter_by_data(data)
    console.log(rainfall)

    // step 4, convert counters to return data format
    const returnData = convert_counters_to_return_data(rainfall)

    return returnData

}


function split_data(data: any) : QueryOption {
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


function get_counter_by_data(data: QueryOption) {
    stats.onYearRange(data.years, data.months, data.days, data.hour, data.minute, data.district_id);
    return stats.get_counters();
}

/*
type Counters = {
  [district_id: number]: {
    [month: number]: {
      [day: number]: {total: number, count: number};
    };
  };
};
*/




function convert_counters_to_return_data(counters: any) : ReturnData[]{
    const results: ReturnData[] = [];
    
    for (let district_id in counters){
        for (let month in counters[district_id]){
            const month_num = parseInt(month);
            
            for (let day in counters[district_id][month]){
                const day_num = parseInt(day);
                const data = counters[district_id][month][day];
                
                // Calculate average: total / count
                const average = data.count > 0 ? data.total / data.count : 0;
                
                results.push({
                    month: month_num,
                    day: day_num,
                    total: data.total,
                    count: data.count,
                    average: average
                });
            }
        }
    }
    
    return results;
}

