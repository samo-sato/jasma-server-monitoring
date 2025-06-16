// This file contains functions performing database operations used in server monitoring function

// Database
import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db/service_monitor.db');

// Logger
import { handleError } from '../functions.js';

// Import types
import { Log, WatchdogState, needNewLog } from './functions.js';

// Interfaces
export interface GetEnabledWatchdogsResponse {
  id: string;
  name: string;
  url: string;
  passive: number;
  email_notif: number;
  enabled: number;
  email: string;
  threshold: number;
  email_active: number;
}

// Interface for results of getting latest self log
interface getLastSelfLogResult {
  start: number;
  stop: number;
}

// Object containing functions performing database operations used in server monitoring function
const handleDB = {

  // Save / update watchdog logs, take data from argument
  updateAddLogs: async function (states: WatchdogState[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        let logsToAdd: Log[] = [];
        let logsToUpdate: Log[] = [];

        // First, determine which logs need to be added vs updated
        await Promise.all(states.map(async state => {
          const log: Log = {
            ...state,
            timestamp_start: Date.now(),
            timestamp_stop: Date.now()
          };
          const needsNew = await needNewLog(log);
          if (needsNew) {
            logsToAdd.push(log);
          } else {
            logsToUpdate.push(log);
          }
        }));

        // Begin transaction
        db.run('BEGIN TRANSACTION', async (beginErr) => {
          if (beginErr) {
            handleError(beginErr, 'Failed to begin transaction');
            return reject(beginErr);
          }

          try {
            // Insert new logs
            if (logsToAdd.length > 0) {
              await new Promise<void>((res, rej) => {
                const insertStmt = db.prepare(`
                  INSERT INTO Watchdog_log (id_watchdog, status, timestamp_start, timestamp_stop, note)
                  VALUES (?, ?, ?, ?, ?)
                `);

                let pending = logsToAdd.length;
                logsToAdd.forEach(log => {
                  insertStmt.run(
                    log.id_watchdog,
                    log.status,
                    log.timestamp_start,
                    log.timestamp_stop,
                    log.note,
                    function (err: Error | null) {
                      if (err) {
                        insertStmt.finalize();
                        rej(err);
                      } else if (--pending === 0) {
                        insertStmt.finalize((finalizeErr) => {
                          if (finalizeErr) rej(finalizeErr);
                          else res();
                        });
                      }
                    }
                  );
                });
                if (logsToAdd.length === 0) {
                  insertStmt.finalize((finalizeErr) => {
                    if (finalizeErr) rej(finalizeErr);
                    else res();
                  });
                }
              });
            }

            // Update existing logs
            if (logsToUpdate.length > 0) {
              await new Promise<void>((res, rej) => {
                const updateStmt = db.prepare(`
                  UPDATE Watchdog_log 
                  SET status = ?, timestamp_stop = ?, note = ?
                  WHERE id_watchdog = ? AND id = (
                    SELECT id FROM Watchdog_log 
                    WHERE id_watchdog = ? 
                    ORDER BY timestamp_stop DESC LIMIT 1
                  )
                `);

                let pending = logsToUpdate.length;
                logsToUpdate.forEach(log => {
                  updateStmt.run(
                    log.status,
                    log.timestamp_stop,
                    log.note,
                    log.id_watchdog,
                    log.id_watchdog,
                    function (err: Error | null) {
                      if (err) {
                        updateStmt.finalize();
                        rej(err);
                      } else if (--pending === 0) {
                        updateStmt.finalize((finalizeErr) => {
                          if (finalizeErr) rej(finalizeErr);
                          else res();
                        });
                      }
                    }
                  );
                });
                if (logsToUpdate.length === 0) {
                  updateStmt.finalize((finalizeErr) => {
                    if (finalizeErr) rej(finalizeErr);
                    else res();
                  });
                }
              });
            }

            // Commit transaction
            db.run('COMMIT', (err) => {
              if (err) {
                db.run('ROLLBACK');
                handleError(err, 'Failed to commit transaction');
                reject(err);
              } else {
                resolve(`Added ${logsToAdd.length} new logs and updated ${logsToUpdate.length} existing logs`);
              }
            });
          } catch (err) {
            db.run('ROLLBACK');
            handleError(err, 'Failed to process logs');
            reject(err);
          }
        });
      } catch (error) {
        db.run('ROLLBACK');
        handleError(error, 'Failed to process logs');
        reject(error);
      }
    });
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
          Watchdog.threshold,
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

  // Get last log with associated Watchdog ID
  getLastLog: function (id_watchdog: string): Promise<Log | undefined> {
    return new Promise((resolve, reject) => {
      
      const sql = 'SELECT * FROM Watchdog_log WHERE id_watchdog = $id_watchdog ORDER BY timestamp_stop DESC LIMIT 1';
      const params = { $id_watchdog: id_watchdog };
      db.get(sql, params,
      function(error, row: Log | undefined) {
        if (error) {
          const msg = 'Getting latest log failed';
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
