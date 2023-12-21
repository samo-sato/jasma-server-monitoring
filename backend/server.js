// import React environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

// logger
import { logger } from './functions.js'

// REST API endpoint handlers
import { app } from './api/endpoints.js'

// server monitoring function
import scan from './scanner/scanner.js'

import { PARSE_INT_BASE } from '../src/globals.js'

const delay = parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE) // time interval (ms) for invoking main "server monitoring" script

// callback is server monitoring function
// callback is used in order to invoke callback function immediately, without waiting for delay to pass
function scanInIntervals(callback, delay) {
  const msg = 'Repeating server monitoring function has started'
  logger.info(msg)
  console.log(msg)
  callback()
  return setInterval(callback, delay)
}

// starting http server
const port = process.env.JASMA_LOCAL_PORT_API

if (!port || port === '') {
  const msg = 'Invalid port variable'
  logger.error(msg)
  throw new Error(msg)
}

app.listen(port, () => {

  const msg = `API server is listening on port ${port}`
  logger.info(msg)
  console.log(msg)

  // invokes server monitoring function in regular intervals
  scanInIntervals(scan, delay)

})
