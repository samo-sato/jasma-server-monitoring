// this file contains functions performing database operations used in server monitoring function
// #############################################################################

// database
import sqlite3 from 'sqlite3'
const db = new sqlite3.Database('./backend/db/service_monitor.db')

// logger
import { logger } from '../functions.js'

const handleDB = {

  // add self log to DB
  // "self logs" are logs that indicate if main backend script is running or not
  writeSelfLog: function (isAfterOutage) {
      return new Promise((resolve, reject) => {
      // running after app's backend outage
      if (isAfterOutage) { // add 2 logs, first log indicating that app's backend started and second indicating that app's backend stopped working (this log will be updated in future runs with fresh timestamp until something breaks and the "stop" timestamp remains indicating when it broke)
        const sql = `
        INSERT
          INTO
        Self_log
          (start, stop)
        VALUES
          ($timestamp, null),
          (null, $timestamp)
        ;`
        const params = { $timestamp: Date.now() }
        db.run(sql, params, function (error) {
          if (error) {
            logger.error(error.stack)
            reject(error.message)
          } else {
            resolve(`Added "start" and "stop" self-log timestamps`)
          }
        })
      } else { // updating "stop" timestamp with fresh timestamp
        const sql = `
        UPDATE
          Self_log
        SET
          stop = $timestamp
        WHERE
          id = (SELECT MAX(id) FROM Self_log);`
          const params = { $timestamp: Date.now() }
        db.run(sql, params, function (error) {
          if (error) {
            logger.error(error.stack)
            reject(error.message)
          } else {
            resolve(`Updated "stop" self-log timestamp`)
          }
        })
      }

    })
  },

  // write Watchdog logs, take data from argument
  // first argument is array of objects with log data, each object representing log data of specific Watchdog
  // second argument is current cycle batch number (each subsequent monitoring "cycle" has unique batch number incremented by 1)
  writeLogs: function (logs) {
    return new Promise((resolve, reject) => {

      if (logs.length > 0) { // if logs provided

        // Use a prepared statement
        const sql = `
        INSERT INTO
          Watchdog_log (batch, timestamp, id_watchdog, status, note)
        VALUES (?, ?, ?, ?, ?)
        ;`
        const stmt = db.prepare(sql, (error) => {
          if (error) {
            const msg = 'Statement preparing to write logs failed'
            logger.error(`${msg} [${error.stack}]`)
            reject(msg)
          }
        })

        // Insert data into the table
        logs.forEach((log) => {
          stmt.run(log.batch, log.timestamp, log.id_watchdog, log.status, log.note, (error) => {
            if (error) {
              const msg = 'Log adding failed'
              logger.error(`${msg} [${error.stack}]`)
              reject(msg)
            }
          })
        })

        // Finalize the statement to close it
        stmt.finalize((error) => {
          if (error) {
            const msg = 'Finalizing statement failed'
            logger.error(`${msg} [${error.stack}]`)
            reject(msg)
          } else {
            resolve(`Added ${logs.length} new Watchdog log(s)`)
          }
        })

      } else {
        resolve('Empty log list, no new logs added')
      }
    })
  },

  // get Watchdog data of all enabled Watchdogs, with email address of user
  getEnabledWatchdogs: function () {
    return new Promise((resolve, reject) => {
        const sql = `
        SELECT
          Watchdog.id,
          Watchdog.name,
          Watchdog.url,
          Watchdog.passive,
          Watchdog.email_notif,
          Watchdog.enabled,
          User.email,
          User.email_active
        FROM
          Watchdog,
          User
        WHERE
          Watchdog.uuid_user=User.uuid AND
          Watchdog.enabled=1
        ;`
        db.all(sql, function(error, rows) {
          if (error) {
            const msg = 'Getting enabled Watchdogs failed'
            logger.error(`${msg} [${error.stack}]`)
            reject(msg)
          } else {
            resolve(rows)
          }
        })
      })
  },

  // get latest batch of logs
  getLastBatch: function () {
    return new Promise((resolve, reject) => {
      const sql = `
      SELECT
        batch,
        timestamp,
        id_watchdog,
        status
      FROM
        Watchdog_log
      WHERE
        batch = (SELECT MAX(batch)
      FROM
        Watchdog_log)
      ;`
      db.all(sql, function(error, rows) {
        if (error) {
          const msg = 'Getting last batch of logs failed'
          logger.error(`${msg} [${error.stack}]`)
          reject(msg)
        } else {
          resolve(rows)
        }
      })
    })
  },

  // get latest self log
  getLastSelfLog: function () {
    return new Promise((resolve, reject) => {
      db.get('SELECT start, stop FROM Self_log WHERE id = (SELECT MAX(id) FROM Self_log);',
      function(error, row) {
        if (error) {
          const msg = 'Getting latest self-log failed'
          logger.error(`${msg} [${error.stack}]`)
          reject(msg)
        } else {
          resolve(row)
        }
      })
    })
  }

}

export default handleDB
