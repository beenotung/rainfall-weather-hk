import express from 'express'
import { print } from 'listening-on'
import { proxy } from './proxy'
import { query } from './query'

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

app.post('/query', async (req, res) => {
  try {
    let input = req.body
    console.log(input)
    let output = query(input)
    console.log(output)
    res.json(output)
  } catch (error) {
    res.status(500)
    res.json({ error: String(error) })
  }
})
