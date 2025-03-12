// Import React environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();

// Logger
import { logger } from './functions.js';

// REST API endpoint handlers
import { app } from './api/endpoints.js';

// Server monitoring function
import scan from './scanner/scanner.js';

import { validateEnv, toInt } from '../src/utils.js';

// Import environment variables
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);

const delay = toInt(REACT_APP_REPEAT_DELAY); // Time interval (ms) for invoking main `server monitoring` script

/**
 * Invoke server monitoring function in regular intervals
 * Callback is used in order to invoke callback function immediately, without waiting for delay to pass first
 * @param callback Callback function
 * @param delay Time interval (ms) for invoking main `server monitoring` script
 * @returns Interval ID
 */
function scanInIntervals(callback: typeof scan, delay: number) {
  const msg = 'Repeating server monitoring function has started';
  logger.info(msg);
  console.log(msg);
  callback();
  return setInterval(callback, delay);
}

// Starting http server
const port = process.env.JASMA_LOCAL_PORT_API;

if (!port || port === '') {
  const msg = 'Invalid port variable';
  logger.error(msg);
  throw new Error(msg);
}

app.listen(port, () => {

  const msg = `API server is listening on port ${port}`;
  logger.info(msg);
  console.log(msg);

  // Invoke server monitoring function in regular intervals
  scanInIntervals(scan, delay);

})
