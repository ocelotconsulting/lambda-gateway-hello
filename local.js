const app = require('./app')
const event = require('./event.json')

const callback = (err, result) => {
  if (err) {
    console.error(`Encountered an error`, err)
  }
  console.log(result)
  process.exit(0)
}

app.handler(event, {}, callback)
