select
  rainfall.amount as rainfall_amount
, rainfall.district_id
, rainfall.time_id
, rainfall.date_id
, rainfall.id as rainfall_id
, district.name as district_name
, time.hour as time_hour
, time.minute as time_minute
, date.year as date_year
, date.month as date_month
, date.day as date_day
from rainfall
inner join district on district.id = rainfall.district_id
inner join time on time.id = rainfall.time_id
inner join date on date.id = rainfall.date_id
