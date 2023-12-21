//  this file contains non-database related functions for scanner functionality
// #############################################################################

// import React environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

// logger
import { logger } from '../functions.js'

import nodeFetch from 'node-fetch'
import dns from 'dns' // used for checking internet connection status
import { PARSE_INT_BASE } from '../../src/globals.js'
import { passiveLogs } from '../api/endpoints.js' // import wide scope array variable, in which "passive logs" are stored and regularly updated
import { sendMail } from '../functions.js'

const delay = parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE) // time interval (ms) for invoking main "server monitoring" script

// checks if internet connection is working, returns promise
// promise is resolved to true if online, or false if offline (probably)
export function checkInternetConnection() {
  return new Promise((resolve, reject) => {
    // first try
    dns.resolve('google.com', err => {
      if (err) {
        // one more try with other domain
        dns.resolve('cloudflare.com', error => {
          if (error) {
            const msg = 'Possible issues with internet connection detected'
            logger.error(`${msg} [${error.stack}]`)
            reject(msg)
          } else {
            resolve('Internet connection ok')
          }
        })
      } else {
        resolve('Internet connection ok')
      }
    })
  })
}

// returns status of the log associated with provided Watchdog ID (wid)
function getStatusByWID (logs, wid) {
  for (let i = 0; i < logs.length; i++) {
    if (logs[i].id_watchdog === wid) {
      return logs[i].status
    }
  }
  return null
}

// sends email notifications to pre-selected email addresses with information about status change
// function returns array of promises that will be settled elsewhere
export function notify(watchdogs) {

  // will contain promises with from each mailing
  const mailingPromises = []

  watchdogs.forEach((watchdog) => {

    const newState = watchdog.statusChangedTo === 1 ? 'online' : 'offline'
    const subject = `"${watchdog.name}" went ${newState} - monitoring update`
    const message = `Server associated with "${watchdog.name}" Watchdog went ${newState} with following message:
${watchdog.note}`

    mailingPromises.push(
      sendMail(watchdog.email, subject, message)
    )

  })

  return Promise.allSettled(mailingPromises)

}

// 1) accepts endpoints in form of an array of url strings
// 2) returns an array of objects representing settled promises:
//    example of an object representing resolved promise:
//      { status: 'fulfilled'
//        value: 'Ok. Endpoint "https://www.example.org/" responded with status code: 200' }
//    example of an object representing rejected promise:
//      { status: 'rejected'
//        value: 'Not ok. Endpoint "https://www.example.com/" responded with status code: 500 }
// 3) the promise is resolved if resource with given endpoint responded with pre-defined status code, otherwise the promise is rejected
export function checkEndpoints(endpoints) {

  const promises = endpoints.map(endpoint => {

    return new Promise((resolve, reject) => {

    // this will set specific timeout for node-fetch
    const controller = new AbortController()
    const timeoutMs = delay/2 // timeout in milliseconds
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs)

    nodeFetch(endpoint, {signal: controller.signal})
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

        let reason = 'Unknown error'
        if (error.code) {
          reason = error.code
        } else if (error.name === 'AbortError') {
          reason = 'Request timed out'
        }

        reject({
          url: endpoint,
          note: `Error. Failed to request "${endpoint}": ${reason}`
        })

      })
      .finally( () => {
        clearTimeout(timeout)
      })

    })

  })

  return Promise.allSettled(promises)

}

// takes "passiveWIDs" array of IDs of passive mode Watchdogs...
// ...compares them with wide scope variable "passiveLogs" which contains recent passive logs from remote servers...
// ...returns only those passive Watchdog IDs, which received request from remote server on specific API endpoint in last recent time period defined by "delay"
export function checkPassiveLogs(passiveWIDs) {

  let results = []

  passiveWIDs.forEach(wid => {

    passiveLogs.forEach(log => {

      if (log.watchdogID === wid && Date.now() - log.timestamp < delay) {
        results.push(wid)
      }

    })

  })

  return results

}

// takes array of Watchdogs (as returned from DB)...
// ...returns array of unique (duplicates removed) urls associated with active mode Watchdogs
export function getActiveUniqueEndpoints(watchdogs) {

  let newArray = []

  // remove passive Watchdogs
  newArray = watchdogs.filter(value => value.passive === 0)

  // only keep values from "url" property
  newArray = newArray.map(value => value.url)

  // remove duplicates
  newArray = [...new Set(newArray)]

  return newArray

}

// takes array of Watchdogs (as returned from DB table) and returns array of Watchdog IDs (WIDs) that operate in passive mode
export function getPassiveWIDs(watchdogs) {
  let newArray = []

  // remove non passive Watchdogs
  newArray = watchdogs.filter(value => value.passive === 1)

  // only keep values from "id" property
  newArray = newArray.map(value => value.id)

  return newArray
}

// generates array of logs based on following input parameters
// watchdogs => enabled Watchdog items
// batchNumber => batch number of logs that will be generated
// activeWatchdogsResults => latest results from Watchdogs in active mode
// alivePassiveWIDs => latest IDs of passive Watchdogs signaling ok status
export function generateLogs(watchdogs, batchNumber, activeWatchdogsResults, alivePassiveWIDs) {

  let logs = []

  watchdogs.forEach(watchdog => {

    // adding active mode Watchdog logs
    if (watchdog.passive === 0) {
      activeWatchdogsResults.forEach(result => {

        let resultUrl

        if (result && result.value && result.value.url) {
          resultUrl = result.value.url
        } else if (result && result.reason && result.reason.url) {
          resultUrl = result.reason.url
        } else {
          resultUrl = undefined
        }

        if (resultUrl === watchdog.url) {
          logs.push({
            batch: batchNumber,
            timestamp: Date.now(),
            id_watchdog: watchdog.id,
            status: result.status === 'fulfilled' ? 1 : 0,
            note: result.status === 'fulfilled' ? result.value.note : result.reason.note
          })
        }
      })
    }

    // adding passive mode Watchdog logs
    if (watchdog.passive === 1) {
      let matchFound = false
      alivePassiveWIDs.forEach(wid => {
        if (wid === watchdog.id) {
          matchFound = true
          logs.push({
            batch: batchNumber,
            timestamp: Date.now(),
            id_watchdog: watchdog.id,
            status: 1,
            note: 'Ok. Endpoint visited in given time period.'
          })
        }
      })
      if (!matchFound) {
        logs.push({
          batch: batchNumber,
          timestamp: Date.now(),
          id_watchdog: watchdog.id,
          status: 0,
          note: 'Not ok. Endpoint not visited in given time period.'
        })
      }
    }

  })

  return logs

}
