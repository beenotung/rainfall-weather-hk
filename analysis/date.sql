select
  date.year
, date.month
, date.day
, count(rainfall.id) as count
from rainfall
inner join date on date.id = rainfall.date_id
group by rainfall.date_id