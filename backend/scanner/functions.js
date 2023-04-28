// this file contains functions mostly used for scanning and logging of given services

const path = require('path')

// database
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database(path.resolve(__dirname, '..', 'db', 'service_monitor.db'))

const { constants } = require(path.resolve(__dirname, '..', '..', 'src', 'constants'))  // some general parameters
const { handleDB } = require(path.resolve(__dirname, '..', 'api', 'methods'))

// used for checking internet connection status
const dns = require('dns')

// mailer
const nodemailer = require('nodemailer');

let lastScanAt = null // here will be stored timestamp of last scanning run

// checks if internet connection is working, returns promise
// promise is resolved to true if online, or false if offline (probably)
function checkInternetConnection() {
  return new Promise((resolve, reject) => {
    // first try
    dns.resolve('google.com', err => {
      if (err) {
        // one more try with other domain
        dns.resolve('cloudflare.com', err => {
          if (err) {
            reject('Out of service - possible issues with internet connection.')
          } else {
            resolve(true)
          }
        })
      } else {
        resolve(true)
      }
    })
  })
}

// block of code, that is called in intervals "on the background" of the app
let i = 0 // counting number of scanning runs
async function repeatThis() {

  try {

    // step #1 - load data from DB

    // get scanning interval (ms) value
    const scanningInterval = await new Promise((resolve, reject) => {
      db.get('SELECT value FROM Parameter WHERE name="scanning_interval";',
      function(error, row) {
        if (error) {
          reject(error.message)
        } else {
          resolve(row.value)
        }
      })
    })

    // allow this function to continue only if
      // predefined time period passed (scanningInterval) since last scanning run (lastScanAt)
      // or...
      // lastScanAt is null which means that there was no scanning run done before and this will be the first time
    let compensation = 1000 // hard to explain, leave it here because it works
    if (!lastScanAt || Date.now() - lastScanAt + compensation > scanningInterval) {
      console.log('Go')
    } else {
      return console.log('Wait')
    }

    // check if internet connection is working and if yes, only then continue to server monitor
    const internetConnectionOk = await checkInternetConnection()

    // executing sacnning run #i...
    console.log('\x1b[32m%s\x1b[0m', `Run #${i} starting`) // make the textual output in different color
    i++ // increase the "scanning run" counter by one

    // get Watchdog data of all enabled Watchdogs
    const watchdogs = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, url, passive, private_id, email_notif FROM Watchdog WHERE enabled=1;',
      function(error, rows) {
        if (error) {
          reject(error.message)
        } else {
          resolve(rows)
        }
      })
    })

    // get latest batch of logs
    const lastResults = await new Promise((resolve, reject) => {
      db.all('SELECT batch, timestamp, id_watchdog, status FROM Watchdog_log WHERE batch = (SELECT MAX(batch) FROM Watchdog_log);',
      function(error, rows) {
        if (error) {
          reject(error.message)
        } else {
          resolve(rows)
        }
      })
    })

    // get latest self log
    const lastSelfLog = await new Promise((resolve, reject) => {
      db.get('SELECT start, stop FROM Self_log WHERE id = (SELECT MAX(id) FROM Self_log);',
      function(error, row) {
        if (error) {
          reject(error.message)
        } else {
          resolve(row)
        }
      })
    })

    // determine if app's backend is after outage or not
    let isAfterOutage = true
    if (
      lastSelfLog && // missing self logs are indicating that app's backend is after outage
      (constants.repeatDelay * 1.5) > (Date.now() - lastSelfLog.stop) // significant gap between last self log timestamp and current timestamp is indicating that app's backend is after outage
    ) {
      isAfterOutage = false // app's backend is (probably) NOT after outage
    }

    // step #2 - check watchdog endpoints

    let watchdogResults = []

    // check endpoint of each related watchdog
    // save results to array of promises
    let promises = watchdogs.map(value => checkEndpoint(value, scanningInterval))

    // check status of endpoints
    const endpointCheckResults = await Promise.all(promises)

    // step #3 - write logs to DB and send notifications if needed

    // write self log
    const selfLogWritten = await handleDB.writeSelfLog(isAfterOutage)
    console.log(selfLogWritten)
    lastScanAt = Date.now() // save timestamp of this run for future use

    // write Watchdog logs
    const batch = lastResults[0] ? lastResults[0].batch + 1 : 1 // calculate batch number from last scanning results (if exist), batch number is unique ID for collection of watchdog logs generated in same scanning run
    const logsMade = await makeLogs(endpointCheckResults, batch) // write watchdog logs to DB
    console.log(logsMade)

    // send email notification if enabled and needed
    const notificationTriggered = await triggerNotification(endpointCheckResults, lastResults)
    console.log('\x1b[33m%s\x1b[0m', 'Notifications sent: ', notificationTriggered) // console log the notes about changes (if detected) in differenct color

  } catch (error) {
    console.log(error)
  }

}

// send email notification if notification enabled and status change detected
async function triggerNotification(results, lastResults) {
  return new Promise((resolve, reject) => {

    let messages = [] // array variable for storing status messages used in email body
    results.forEach(result => { // looping trough current results from the scanning run
      let lastResult = lastResults.find(lastResult => lastResult.id_watchdog === result.watchdogId) // obtaining scanning result from last results with same watchdog ID as current watchdog ID

      if (result.watchdogNotif == 1 && result.status !== lastResult.status) { // checking results for enabled notifications and status change

        // generating text for the user describing status of current service
        let state = result.status == 0 ? 'offline' : 'online'
        messages.push(`Service "${result.watchdogName}" went ${state}`)

      }

    })

    // generating text for email body
    msgText = ''
    messages.forEach(message => {
      msgText +=  `${message}\n`
    })

    // sending notification email if changes between current result and last result were detected
    if (msgText.length > 0) {

      sendMail('JASMA monitoring notification', msgText)
        .then(response => {
          resolve(`Status change count: ${messages.length}. Email notification sent.`)
        })
        .catch(error => {
          reject(error)
        })

      resolve(messages)

    }
  })
}

// check given url endpoint (using http request) and return results in resovled promise
// promise is always resolved, regardless endpoint's status, it resolves to object with details about endpoint status
function checkEndpoint(watchdog, scanningInterval) {
  return new Promise((resolve, reject) => {

    // basic data about checked Watchdog will be added to resolved promise object
    let responseHead = {
      watchdogId: watchdog.id,
      watchdogName: watchdog.name,
      watchdogUrl: watchdog.url,
      watchdogNotif: watchdog.email_notif,
    }

    let isPassive = watchdog.passive === 1 ? true : false // determining if checked Watchdog is in passive or active mode (Watchdog in active mode is making http request to monitored service, Watchdog in passive mode is waiting for request from monitored service instead - this is treated in different code)
    console.log(`Checking watchdog id ${watchdog.id} (passive mode: ${isPassive})`) // console log information about what Watchdog is being checked and in what mode the Watchdog operates

    if (isPassive) { // if given Watchdog operates in passive mode...

      let { passiveLogs } = require(path.resolve(__dirname, '..', 'api', 'api')) // import array variable in which "passive logs" are stored (logs about requests from monitored services in passive mode)

      // this code is searching for relevant passive log inside imported array with passive logs and if found, testing it if it is not expired (too old log)
      // if passive log with given Watchdog id exists and is "fresh", promise can be resolved with ok status for checked endpoint
      let logAccepted = false // bool value determining if passive log of given Watchdog is evaluated as valid/accepted
      for (let i = 0; i < passiveLogs.length; i++) {
        if (passiveLogs[i].privateId == watchdog.private_id && Date.now() - passiveLogs[i].timestamp <= scanningInterval) {
          resolve({
            ...responseHead,
            status: 1,
            note: `Good. Watchdog "${watchdog.name}" received response from monitored service in given time window.`
          })
          logAccepted = true
          break
        }
      }

      // otherwise resolve promise with "not ok" status - passive log for relevant Watchdog is either missing or is expired
      if(!logAccepted) {
        resolve({
          ...responseHead,
          status: 0,
          note: `Bad. Watchdog "${watchdog.name}" did not receive response from monitored service in given time window.`
        })
      }
    } else { // if given Watchdog operates in active mode (not in passive mode)...

      // preparing some variables for http request
      const url = new URL(watchdog.url)
      const protocol = url.protocol
      const hostname = url.hostname
      const port = url.port
      const path = `${url.pathname}${url.search}`
      const options = {
        protocol: protocol,
        hostname: hostname,
        path: path
      }

      if (port.length > 0) {
        options.port = port
      }

      const httpx = protocol === 'https:' ? require('https') : require('http')

      // making http/https request to given Watchdog's url endpoint
      const req = httpx.request(options, res => {
        if (res.statusCode >= 200 && res.statusCode <= 399) { // consider certain range of http response codes as "ok status" and resolve promise
          resolve({
            ...responseHead,
            status: 1,
            note: `Good. Service at ${watchdog.url} responded with code ${res.statusCode}.`
          })
        } else { // otherwise consider status as "not ok" and resolve promise
          resolve({
            ...responseHead,
            status: 0,
            note: `Bad. Service at ${watchdog.url} responded with code ${res.statusCode}.`
          })
        }
      })
      req.on('error', error => { // if error occured during request making, also consider status as "not ok"
        resolve({
            ...responseHead,
          status: 0,
          note: `Bad. Something went wrong while requesting ${watchdog.url}. Error: ${error}`
        })
      })
      req.end()
    }

  })
}

// send mail
// async..await is not allowed in global scope, must use a wrapper
async function sendMail(subject, message) {
  let testAccount = await nodemailer.createTestAccount()

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: process.env.JASMA_mail_host,
    port: process.env.JASMA_mail_pw,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.JASMA_mail_login,
      pass: process.env.JASMA_mail_pw
    },
  })

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: "Service monitor", // sender address
    to: process.env.JASMA_mail_address, // receiver / list of receivers
    subject: subject, // Subject line
    text: message // plain text body
    // html: "<b>Html bold body</b>", // html body
  })

}

// write Watchdog logs, take data from argument
// first argument is array of objects with log data, each object representing log data of specific Watchdog
// second argument is current cycle batch number (each subsequent monitoring "cycle" has unique batch number incremented by 1)
function makeLogs(watchdogResults, batch) {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now() // current timestamp (unix epoch miliseconds)

    if (watchdogResults.length > 0) { // if logs provided

      // create value list for SQL query string
      let valueList = '' // value list with latest log data to be written into DB table with Watchdog logs
      watchdogResults.forEach((watchdogResult, index) => { // looping throug each Watchdog's provided latest logs
        let separator = watchdogResults.length === index + 1 ? '' : ', ' // separator separating values in SQL query
        valueList = valueList.concat(`(${batch}, ${timestamp}, ${watchdogResult.watchdogId}, ${watchdogResult.status}, '${watchdogResult.note}')${separator}`) // constructing value list used in SQL query
      })

      // final sql string for adding Watchdog log(s) do DB table
      let sqlString = `INSERT INTO Watchdog_log (batch, timestamp, id_watchdog, status, note) VALUES ${valueList};`

      // executing sql query
      db.run(
        sqlString,
        function (error) {
          if (error) {
            reject(error.message)
          } else {
            resolve(`Added ${watchdogResults.length} new Watchdog log(s)`)
          }
        }
      )
    } else {
      resolve('Empty log list, no logs added')
    }
  })
}

module.exports = { repeatThis }
