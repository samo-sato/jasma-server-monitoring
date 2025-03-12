// This file contains functions performing database operations used in server monitoring function

// Database
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db/service_monitor.db');

// Logger
import { handleError } from '../functions.js';

// Import types
import { Logs } from './functions.js';

// Interfaces
export interface GetEnabledWatchdogsResponse {
  id: string;
  name: string;
  url: string;
  passive: number;
  email_notif: number;
  enabled: number;
  email: string;
  email_active: number;
}

// Interface for results of getting latest batch of logs
interface getLastBatchResults {
  batch: number;
  timestamp: number;
  id_watchdog: string;
  status: number;
}

// Interface for results of getting latest self log
interface getLastSelfLogResult {
  start: number;
  stop: number;
}

// Object containing functions performing database operations used in server monitoring function
const handleDB = {

  // Add self log to DB
  // `Self logs` are logs that indicate if main backend script is running or not
  writeSelfLog: function (isAfterOutage: boolean) {
      return new Promise((resolve, reject) => {
      // Running after app's backend outage
      if (isAfterOutage) { // Add 2 logs, first log indicating that app's backend started and second indicating that app's backend stopped working (this log will be updated in future runs with fresh timestamp until something breaks and the `stop` timestamp remains indicating when it broke)
        const sql = `
        INSERT
          INTO
        Self_log
          (start, stop)
        VALUES
          ($timestamp, null),
          (null, $timestamp)
        ;`;
        const params = { $timestamp: Date.now() };
        db.run(sql, params, function (error) {
          if (error) {
            handleError(error, 'Adding "start" and "stop" self-log timestamps failed');
            reject(error.message);
          } else {
            resolve(`Added "start" and "stop" self-log timestamps`);
          }
        })
      } else { // Updating `stop` timestamp with fresh timestamp
        const sql = `
        UPDATE
          Self_log
        SET
          stop = $timestamp
        WHERE
          id = (SELECT MAX(id) FROM Self_log);`;
          const params = { $timestamp: Date.now() }
        db.run(sql, params, function (error) {
          if (error) {
            handleError(error, 'Updating "stop" self-log timestamp failed');
            reject(error.message);
          } else {
            resolve(`Updated "stop" self-log timestamp`);
          }
        })
      }

    })
  },

  // Write watchdog logs, take data from argument
  // First argument is array of objects with log data, each object representing log data of specific watchdog
  // Second argument is current cycle batch number (each subsequent monitoring `cycle` has unique batch number incremented by 1)
  writeLogs: function (logs: Logs[]): Promise<string> {
    return new Promise((resolve, reject) => {

      if (logs.length > 0) { // If logs provided

        // Use a prepared statement
        const sql = `
        INSERT INTO
          Watchdog_log (batch, timestamp, id_watchdog, status, note)
        VALUES (?, ?, ?, ?, ?)
        ;`;
        const stmt = db.prepare(sql, (error) => {
          if (error) {
            const msg = 'Statement preparing to write logs failed';
            handleError(error, msg);
            reject(msg);
          }
        })

        // Insert data into the table
        logs.forEach((log) => {
          stmt.run(log.batch, log.timestamp, log.id_watchdog, log.status, log.note, (error: any) => {
            if (error) {
              const msg = 'Log adding failed';
              handleError(error, msg);
              reject(msg);
            }
          })
        })

        // Finalize the statement to close it
        stmt.finalize((error) => {
          if (error) {
            const msg = 'Finalizing statement failed';
            handleError(error, msg);
            reject(msg);
          } else {
            resolve(`Added ${logs.length} new Watchdog log(s)`);
          }
        })

      } else {
        resolve('Empty log list, no new logs added');
      }
    })
  },

  // Get watchdog data of all enabled watchdogs, with email address of user
  getEnabledWatchdogs: function () {
    return new Promise<GetEnabledWatchdogsResponse[]>((resolve, reject) => {
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
        ;`;
        db.all(sql, function(error, rows: GetEnabledWatchdogsResponse[]) {
          if (error) {
            const msg = 'Getting enabled Watchdogs failed';
            handleError(error, msg);
            reject(msg);
          } else {
            resolve(rows)
          }
        })
      })
  },
  
  // Get latest batch of logs
  getLastBatch: function (): Promise<getLastBatchResults[]> {
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
      ;`;
      db.all(sql, function(error, rows: getLastBatchResults[]) {
        if (error) {
          const msg = 'Getting last batch of logs failed';
          handleError(error, msg);
          reject(msg);
        } else {
          resolve(rows);
        }
      })
    })
  },

  // Get latest self log
  getLastSelfLog: function (): Promise<getLastSelfLogResult> {
    return new Promise((resolve, reject) => {
      db.get('SELECT start, stop FROM Self_log WHERE id = (SELECT MAX(id) FROM Self_log);',
      function(error, row: getLastSelfLogResult) {
        if (error) {
          const msg = 'Getting latest self-log failed';
          handleError(error, msg);
          reject(msg);
        } else {
          resolve(row);
        }
      })
    })
  }

}

export default handleDB;
