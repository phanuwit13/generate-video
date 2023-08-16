const express = require('express')
const routes = require('./routes')

const app = express()
const port = 8080

app.use(express.json())
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin,X-Requested-With,Content-Type,Accept, x-access-token, x-refresg-token,_id,Authorization'
  )
  res.header('Access-Control-Expose-Headers', 'x-access-token, x-refresg-token')
  next()
})

app.get('/', (req, res) => {
  res.send('generate video service')
})

app.use('/api', routes)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
