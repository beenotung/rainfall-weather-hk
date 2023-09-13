select
  date.month
, date.day
, (date.month || '-' || date.day) as date
, min(rainfall.amount)
, avg(rainfall.amount)
, max(rainfall.amount)
from rainfall
inner join date on date.id = rainfall.date_id
group by date.month, date.day
order by date.month, date.day