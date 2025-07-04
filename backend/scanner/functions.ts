//  This file contains non-database related functions for scanner functionality

// Import React environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();

// Logger
import { handleError } from '../functions.js';

// Import wide scope array variable, in which `passive logs` are stored and regularly updated
import { passiveLogs } from '../api/endpoints.js';

// Other dependencies
import { validateEnv, toInt, delayWithMargin } from '../../src/utils.js'; // Validate environment variables
import nodeFetch from 'node-fetch'; // Fetching resources
import dns from 'dns'; // Checking internet connection status
import { sendMail, SendMailResponse } from '../functions.js'; // Send emails
import { GetEnabledWatchdogsResponse } from './handleDB.js'; // Interface for Watchdogs

// Import environment variables
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);

// Time interval (ms) for invoking main `server monitoring` script
const delay = toInt(REACT_APP_REPEAT_DELAY);

// Type interfaces
interface WatchdogToNotify {
  id: string;
  statusChangedTo: number;
  email: string;
  name: string;
  note: string;
}

export interface Log {
  id_watchdog: string;
  status: number;
  timestamp_start: number;
  timestamp_stop: number;
  counter: number;
  delay: number;
  note: string;
}

export interface WatchdogState {
  id_watchdog: string;
  status: number;
  note: string;
}

/**
 * Check if internet connection is working, returns promise
 * Promise is resolved to true if online, or false if offline (probably)
 * @returns Promise - resolved if internet connection is ok, rejected if not
*/
export function checkInternetConnection(): Promise<string> {
  return new Promise((resolve, reject) => {
    // First try
    dns.resolve('google.com', err => {
      if (err) {
        // One more try with other domain
        dns.resolve('cloudflare.com', error => {
          if (error) {
            const msg = 'Possible issues with internet connection detected';
            handleError(error, msg);
            reject(msg);
          } else {
            resolve('Internet connection ok');
          }
        })
      } else {
        resolve('Internet connection ok');
      }
    })
  })
}

/**
 * Send email notifications to pre-selected email addresses with information about status change
 * Return array of promises that will be settled elsewhere
 * @param watchdogs Array of Watchdog objects to notify
 * @returns Array of promises with results of sending emails
*/
export function notify(watchdogs: WatchdogToNotify[]): Promise<PromiseSettledResult<SendMailResponse>[]> {

  // Will contain promises with from each mailing
  const mailingPromises: Promise<SendMailResponse>[] = [];

  watchdogs.forEach((watchdog) => {
    const newState = watchdog.statusChangedTo === 1 ? 'online' : 'offline';
    const subject = `"${watchdog.name}" went ${newState} - monitoring update`;
    const message = `Server associated with "${watchdog.name}" Watchdog went ${newState} with following message: ${watchdog.note}`;
    mailingPromises.push(sendMail(watchdog.email, subject, message));
  })

  return Promise.allSettled(mailingPromises);

}

/**
 * 1) Accept endpoints in form of an array of url strings
 * 2) Return an array of objects representing settled promises:
 *    Example of an object representing resolved promise:
 *      { status: 'fulfilled'
 *        value: 'Ok. Endpoint "https://www.example.org/" responded with status code: 200' }
 *    Example of an object representing rejected promise:
 *      { status: 'rejected'
 *        value: 'Not ok. Endpoint "https://www.example.com/" responded with status code: 500 }
 * 3) The promise is resolved if resource with given endpoint responded with pre-defined status code, otherwise the promise is rejected
 * @param endpoints Array of url strings
 * @returns Array of objects representing settled promises
*/
export function checkEndpoints(endpoints: string[]): Promise<any[]> {

  const promises = endpoints.map(endpoint => {

    return new Promise((resolve, reject) => {

    // This will set specific timeout for node-fetch
    const controller = new AbortController();
    const timeoutMs = delay / 2; // Timeout in milliseconds
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs)

    nodeFetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    })
      .then(response => {
        if (response.status >= 200 && response.status <= 299) {
          resolve({
            url: endpoint,
            note: `Ok. Endpoint "${endpoint}" responded with status code: ${response.status}`
          })
        } else {
          reject({
            url: endpoint,
            note: `Not ok. Endpoint "${endpoint}" responded with status code: ${response.status}`
          })
        }
      })
      .catch(error => {

        let reason = 'Unknown error';
        if (error.code) {
          reason = error.code;
        } else if (error.name === 'AbortError') {
          reason = 'Request timed out';
        }

        reject({
          url: endpoint,
          note: `Error. Failed to request "${endpoint}": ${reason}`
        })

      })
      .finally( () => {
        clearTimeout(timeout);
      })

    })

  })

  return Promise.allSettled(promises);

}

/**
 * Accept `passiveWIDs` array of IDs of passive mode Watchdogs...
 * ...compare them with wide scope variable `passiveLogs` which contains recent passive logs from remote servers...
 * @param passiveWIDs Array of IDs of passive mode Watchdogs
 * @returns Array of IDs of passive mode Watchdogs that received request from remote server on specific API endpoint in last recent time period defined by `delay`
*/
export function checkPassiveLogs(passiveWIDs: string[]): string[] {

  let results: string[] = [];

  passiveWIDs.forEach(wid => {

    passiveLogs.forEach(log => {

      if (log.watchdogID === wid && Date.now() - log.timestamp < delay) {
        results.push(wid);
      }

    })

  })

  return results;

}

/**
 * Take array of Watchdogs (as returned from DB)...
 * @param watchdogs Array of Watchdogs
 * @returns Array of unique urls (duplicates removed) associated with active mode Watchdogs
*/
export function getActiveUniqueEndpoints(watchdogs: GetEnabledWatchdogsResponse[]): string[] {

  let newArray = [];

  // Remove passive Watchdogs
  newArray = watchdogs.filter(value => value.passive === 0);

  // Only keep values from "url" property
  newArray = newArray.map(value => value.url);

  // Remove duplicates
  newArray = [...new Set(newArray)];

  return newArray;

}

/**
 * Take array of Watchdogs (as returned from DB table) and returns array of Watchdog IDs (WIDs) that operate in passive mode
 * @param watchdogs Array of Watchdogs
 * @returns Array of Watchdog IDs (WIDs) that operate in passive mode
*/
export function getPassiveWIDs(watchdogs: GetEnabledWatchdogsResponse[]) {
  let newArray = [];

  // Remove non passive Watchdogs
  newArray = watchdogs.filter(value => value.passive === 1);

  // Only keep values from `id` property
  newArray = newArray.map(value => value.id);

  return newArray;
}

/**
 * Get current state of Watchdogs based on following input parameters
 * @param watchdogs Array of enabled Watchdog items
 * @param activeWatchdogsResults Latest results from Watchdogs in active mode
 * @param alivePassiveWIDs Latest IDs of passive Watchdogs signaling ok status
 * @returns Array of watchdog states
*/
export async function getCurrentStateOfWatchdogs(watchdogs: GetEnabledWatchdogsResponse[], activeWatchdogsResults: any[], alivePassiveWIDs: string[]): Promise<WatchdogState[]> {

  let states: WatchdogState[] = [];
  const results = await activeWatchdogsResults;
  watchdogs.forEach(watchdog => {
    
    // Adding active mode Watchdog states
    if (watchdog.passive === 0) {
      results.forEach(result => {

        let resultUrl;

        if (result && result.value && result.value.url) {
          resultUrl = result.value.url;
        } else if (result && result.reason && result.reason.url) {
          resultUrl = result.reason.url;
        } else {
          resultUrl = undefined;
        }

        if (resultUrl === watchdog.url) {
          states.push({
            id_watchdog: watchdog.id,
            status: result.status === 'fulfilled' ? 1 : 0,
            note: result.status === 'fulfilled' ? result.value.note : result.reason.note
          })
        }
      })
    }

    // Adding passive mode Watchdog states
    if (watchdog.passive === 1) {
      let matchFound = false;
      alivePassiveWIDs.forEach(wid => {
        if (wid === watchdog.id) {
          matchFound = true
          states.push({
            id_watchdog: watchdog.id,
            status: 1,
            note: 'Ok. Endpoint visited in given time period.'
          })
        }
      })
      if (!matchFound) {
        states.push({
          id_watchdog: watchdog.id,
          status: 0,
          note: 'Not ok. Endpoint not visited in given time period.'
        })
      }
    }

  })

  return states;

}

/**
 * Check, if adding new log is needed or updating existing log is needed
 * @param state
 * @param lastLog
 * @returns `true` if adding new log is needed, `false` if updating existing log is needed
 * Adding new log is needed if any of the following conditions is met:
 *  1) Last log with same Watchdog ID does not exist yet
 *  2) Last log with same Watchdog ID has different status or note
 *  3) Last log with same Watchdog ID has not been updated lately (last log is older than `gapThreshold`)
 * Otherwise, updating existing log is needed
*/
export async function needNewLog(currentState: WatchdogState, lastLog: Log | undefined) {
  return new Promise(async (resolve, reject) => {
    try {
      
      // 1) If no previous log exists, we need a new one
      if (!lastLog) {
        resolve(true);
        return;
      }

      // 2) If last log has different status or note, we need a new one
      if (lastLog.status !== currentState.status || lastLog.note !== currentState.note) {
        resolve(true);
        return;
      }

      // 3) If last log is older than `gapThreshold`, we need a new one
      // This ensures we have regular log entries even if status hasn't changed
      if (Date.now() - lastLog.timestamp_stop > delayWithMargin(delay)) {
        resolve(true);
        return;
      }

      // Otherwise, we need to update existing log
      resolve(false);
      return;

    } catch (error) {
      handleError(error, 'Failed to get last log');
      reject(error);
    }
  })
}
