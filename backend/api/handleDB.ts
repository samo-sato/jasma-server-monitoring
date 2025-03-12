// Import React environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();

// Logger
import { logger } from '../functions.js';

import { LogFilterQuery } from './functions.js';
import { toInt, generateRandomString, msToWords, serErr, validateEnv, Settings, GenericPromiseReturn } from '../../src/utils.js';
import { hash, generateUUID, saltedPwHash, generateWatchdogId, getCurrentDateTimeUTC } from './../functions.js';

import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./backend/db/service_monitor.db');

// Import environment variables
const JASMA_MAX_WATCHDOGS = validateEnv(process.env.JASMA_MAX_WATCHDOGS, true);
const JASMA_PW_LENGTH_USER = validateEnv(process.env.JASMA_PW_LENGTH_USER, true);
const JASMA_SALT = validateEnv(process.env.JASMA_SALT, true);
const REACT_APP_DEF_THRESHOLD = validateEnv(process.env.REACT_APP_DEF_THRESHOLD, true);
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);

// Interfaces and type definitions
interface WatchdogData {
  wid?: string;
  url: string;
  name: string;
  email_notif: number;
  passive: number;
  enabled: number;
  threshold: number;
}

/**
 * Check if given non-master user reached maximum count of enabled `watchdogs`
 * @param uuid Uuid of the user
 * @returns Rejected promise if user is non-master with max count of `watchdogs` reached (or error occured), otherwise promise is resolved
 */
export function checkMaxWatchdogs(uuid: string) {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
      COUNT(Watchdog.id) as count
    FROM
      User,
      Watchdog
    WHERE
      User.uuid = $uuid AND
      User.uuid = Watchdog.uuid_user AND
      User.master = 0 AND
      Watchdog.enabled = 1
    ;`;
    const params = { $uuid: uuid }
    db.get(sql, params, function (error, row: { count: number }) {
        if (error) {
          const msg = `Getting Watchdog Count for User [${uuid}] from DB has failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: 'Failed to get Watchdog count'
          })
        } else if (!row) {
          const msg = `No Watchdog count returned for User [${uuid}] from DB`;
          logger.error(msg);
          reject({
            code: 500,
            data: 'No Watchdog count returned'
          })
        } else if (row.count >= toInt(JASMA_MAX_WATCHDOGS)) {
          reject({
            code: 400,
            data: `The maximum number of enabled Watchdogs has reached the limit of ${toInt(JASMA_MAX_WATCHDOGS)}`
          });
        } else {
          resolve({
            code: 200,
            data: 'ok'
          })
        }
      }
    )
  })

}

/**
 * Add email address to table of unsubscribed email addresses
 * @param key Key from the url
 * @returns Resolved promise if unsubscribed, rejected promise otherwise
 */
export function unsubscribeEmail(key: string): Promise<GenericPromiseReturn> {

interface UnsubscribeEmailResponse {
    code: number;
    data: string;
}

  return new Promise<UnsubscribeEmailResponse>((resolve, reject) => {

    const sql = `
    INSERT INTO Unsubscribed (
      email
    ) VALUES(
      (SELECT email FROM User WHERE unsubscribe_key = $key)
    )
    ;`;
    const params = { $key: key }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Inserting unsubscribed email address to DB failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr
          });
        } else {
          resolve({
            code: 201,
            data: 'Successfully unsubscribed'
          });
        }
      }
    )

  })

}

/**
 * Activetes email address based on activation link (key)
 * @param key Activation key from the url
 * @returns Promise with results
*/
export function activateEmail(key: string): Promise<GenericPromiseReturn> {

  interface ActivateEmailResponse {
    code: number;
    data: string;
  }

  return new Promise<ActivateEmailResponse>((resolve, reject) => {

    const sql = `
    UPDATE
      User
    SET
      email_active = 1
    WHERE
      activation_key = $key
    ;`;

    const params = { $key: key }

    db.run(sql, params, function (error) {
      if (error) {
        const msg = 'Email activation DB UPDATE failed. DB error.'
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: serErr
        });
      } else {
        if (this.changes !== 1) {
          const msg = `Email activation DB UPDATE failed. No changes.`;
          logger.error(msg);
          reject({
            code: 400,
            data: 'Email address activation failed'
          });
        } else {
          const msg = 'Email address activated'
          logger.info(`${msg} [${key}]`);
          resolve({
            code: 201,
            data: msg
          })
        }
      }
    })

  })

}

/**
 * Add new user to DB (for demo account => master=0)
 * @returns Promise with results
*/
export function addUser(): Promise<GenericPromiseReturn> {

  interface AddUserResponse {
    code: number;
    data: {
      uuid: string;
      password: string;
    };
  }

  return new Promise<AddUserResponse>((resolve, reject) => {

    const uuid = generateUUID();
    const password = generateRandomString(toInt(JASMA_PW_LENGTH_USER));
    const salt = JASMA_SALT;
    const hashedPw = saltedPwHash(password, salt);

    const sql = `
    INSERT INTO
      User (uuid, hash, master)
    VALUES ($uuid, $hashedPw, 0)
    ;`;
    const params = {
      $uuid: uuid,
      $hashedPw: hashedPw
    }
    db.run(sql, params, function (error) { // Adding new User to DB
      if (error) {
        const msg = 'Inserting new User to DB failed.';
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: 'Creating new account failed',
        })
      } else { // User was added to DB

        // Prepare data for new Watchdog
        const wid = generateWatchdogId();
        const data = {
          watchdogID: wid,
          url: 'https://www.example.com',
          name: 'Example.com',
          email_notif: 0,
          passive: 0,
          enabled: 1,
          threshold: toInt(REACT_APP_DEF_THRESHOLD)
        }

        // Add first testing Watchdog for new User
        addWatchdog(data, uuid)
          .then(response => {
            resolve({
              code: 200,
              data: {
                uuid: uuid,
                password: password,
              }
            })
          })
          .catch(error => {
            const msg = `Testing Watchdog [${wid}] for User [${uuid}] failed to add to DB.`;
            logger.error(msg);
            reject({
              code: 500,
              data: 'Watchdog adding for new user failed'
            })
          })
      }
    })

  })

}

/**
 * Get `Watchdog` items of User
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function getWatchdogs(uuid: string): Promise<GenericPromiseReturn> {

  interface GetWatchdogsResponse {
    code: number;
    data: any[];
  }

  return new Promise<GetWatchdogsResponse>((resolve, reject) => {
    const sql = `
    SELECT
      Watchdog.*,
      MAX(Watchdog_log.timestamp) as last_log_at,
      Watchdog_log.status as last_status,
      Watchdog_log.note as last_note
    FROM
      Watchdog
    LEFT JOIN
      Watchdog_log
    ON
      Watchdog.id = Watchdog_log.id_watchdog
    WHERE
      Watchdog.uuid_user = $uuid
    GROUP BY
      Watchdog.id
    ;`;
    const params = { $uuid: uuid }
    db.all(sql, params, function (error, result) {
        if (error) {
          const msg = `Getting Watchdogs from DB for uuid [${uuid}] has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: 'Watchdogs failed to be retrieved'
          })
        } else {
            resolve({
              code: 200,
              data: result
            })
        }
      }
    )
  })

}

/**
 * Get single `Watchdog` item
 * @param id ID of the watchdog
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function getWatchdog(id: string, uuid: string): Promise<GenericPromiseReturn> {

  interface GetWatchdogResponse {
    code: number;
    data: {};
  }

  return new Promise<GetWatchdogResponse>((resolve, reject) => {
    const sql = 'SELECT * FROM Watchdog WHERE id = $id AND uuid_user = $uuid;';
    const params = {
      $id: id,
      $uuid: uuid
    }
    db.get(sql, params, function (error, row) {
        if (error) {
          const msg = `Getting Watchdog [${id}] for User [${uuid}] from DB has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: 'Failed to get Watchdog'
          })
        } else if (!row) {
          const msg = `No Watchdog with ID [${id}] for User [${uuid}] found in DB`
          logger.error(msg)
          reject({
            code: 404,
            data: 'No Watchdog with given ID found'
          })
        } else {
            resolve({
              code: 200,
              data: row
            })
        }
      }
    )
  })

}

/**
 * Update single `Watchdog` item
 * @param id ID of the watchdog
 * @param data Data to update
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function updateWatchdog(id: string, data: WatchdogData, uuid: string): Promise<GenericPromiseReturn> {

  interface UpdateWatchdogResponse {
    code: number;
    data: string;
  }

  return new Promise<UpdateWatchdogResponse>((resolve, reject) => {
    const sql = `
    UPDATE Watchdog SET
      name = $name,
      url = $url,
      email_notif = $email_notif,
      enabled = $enabled,
      threshold = $threshold
     WHERE
     id = $id AND
     uuid_user = $uuid
     ;`;
    const params = {
      $id: id,
      $url: data.url,
      $name: data.name,
      $email_notif: data.email_notif,
      $enabled: data.enabled,
      $threshold: data.threshold,
      $uuid: uuid,
    }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Updating Watchdog [${id}] in DB for User [${uuid}] failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr
          })
        } else {
          const msg = `Watchdog [${id}] in DB for User [${uuid}] was updated`;
          logger.info(msg);
          resolve({
            code: 201,
            data: `The "${data.name}" watchdog has been successfully updated. The changes will take effect in the next monitoring cycle, which may take up to ${msToWords(toInt(REACT_APP_REPEAT_DELAY))}.`
          })
        }
      }
    )
  })
}

/**
 * Delete single `Watchdog` item
 * @param id ID of the watchdog
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function deleteWatchdog(id: string, uuid: string): Promise<GenericPromiseReturn> {

  interface DeleteWatchdogResponse {
    code: number;
    data: string;
  }

  return new Promise<DeleteWatchdogResponse>((resolve, reject) => {
    const sql = `
    DELETE
    FROM
    Watchdog
    WHERE
      id = $id AND
      uuid_user = $uuid
    ;`;
    const params = {
      $id: id,
      $uuid: uuid
    }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Deleting Watchdog [${id}] of User [${uuid}] from DB failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: null
          })
        } else {
            resolve({
              code: 204,
              data: 'Failed to delete Watchdog'
            })
        }
      }
    )
  })

}

/**
 * Checks for diplicity in Watchdog `name` and `url`
 * Same uuid should not contain multiple Watchdogs with same name or url endpoint
 * with exception of `passive mode` Watchdog item, where all urls are set to NULL
 * @param name Name of the watchdog
 * @param url URL of the watchdog
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function checkWatchdogDuplicity(name: string, url: string, uuid: string): Promise<GenericPromiseReturn> {

  interface CheckWatchdogDuplicityResponse {
    code: number;
    data: string;
  }

  return new Promise<CheckWatchdogDuplicityResponse>((resolve, reject) => {
    const sql = `
    SELECT
      COUNT(id) as count
    FROM
      Watchdog
    WHERE
      uuid_user = $uuid AND
      (name = $name OR (url = $url AND passive = 0))
    ;`;
    const params = {
      $uuid: uuid,
      $name: name,
      $url: url
    }
    let msg = `DB duplicity Watchdog name [${name}] and url [${url}] of User [${uuid}] check failed: `;
    db.get(sql, params, function (error, row: { count: number }) {
      if (error) {
        msg += 'DB error';
        logger.error(`${msg} [${error.stack}]`);
        reject({
          data: serErr,
          code: 500
        })
      } else if (!row) {
        msg += `no results`
        logger.error(msg)
        reject({
          data: serErr,
          code: 500
        })
      } else {
        if (row.count === 0) { // Ok, no duplicates found
          resolve({
            data: 'ok',
            code: 200
          })
        } else { // Not ok - duplicates found
          reject({
            data: 'Same name and/or URL already exists',
            code: 400
          })
        }
      }
    })
  })

}

/**
 * Add single `Watchdog` item
 * @param data Data to add
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function addWatchdog(data: WatchdogData, uuid: string): Promise<GenericPromiseReturn> {

  interface AddWatchdogResponse {
    code: number;
    data: string;
  }

  return new Promise<AddWatchdogResponse>((resolve, reject) => {

    const sql = `
    INSERT INTO Watchdog (
      id,
      uuid_user,
      name,
      url,
      email_notif,
      threshold,
      passive,
      enabled
    ) VALUES(
      $id,
      $uuid,
      $name,
      $url,
      $email_notif,
      $threshold,
      $passive,
      $enabled
    );`;

    // Passive mode Watchdogs use pre-generated ID from hidden <input> element at frontend side
    const wid = data.passive === 1 ? data.wid : generateWatchdogId();

    const params = {
      $id: wid,
      $uuid: uuid,
      $url: data.passive === 1 ? null : data.url, // Passive mode Watchdogs do not have URL
      $name: data.name,
      $email_notif: data.email_notif,
      $threshold: data.threshold,
      $passive: data.passive,
      $enabled: data.enabled,
    }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Adding new Watchdog to DB for user [${uuid}] has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: 'Database error'
          })
        } else {
          logger.info(`New Watchdog ID [${wid}] with name [${data.name}] has been added to DB`);
          resolve({
            code: 201,
            data: `New watchdog "${data.name}" added`
          })
        }
      }
    )

  })
}

/**
 * Get basic stats for homepage
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function getStats(uuid: string): Promise<GenericPromiseReturn> {

  interface GetStatsResponse {
    code: number;
    data: any[];
  }

  return new Promise<GetStatsResponse>((resolve, reject) => {

    const sql = `
      SELECT
        Watchdog.name as watchdog,
      CASE
        WHEN Watchdog_log.status = 1 AND Watchdog_log.timestamp >= $timestampNow - $interval THEN 1
        ELSE 0
      END AS is_online
      FROM
        Watchdog,
        Watchdog_log
      WHERE
        Watchdog.enabled = 1 AND
        Watchdog.id = Watchdog_log.id_watchdog AND
        Watchdog.uuid_user = $uuid
      GROUP BY Watchdog.id
      HAVING MAX(Watchdog_log.timestamp)
      ;`;

    const params = {
      $interval: toInt(REACT_APP_REPEAT_DELAY),
      $uuid: uuid,
      $timestampNow: Date.now()
    }

    db.all(sql, params, function (error, result) {
        if (error) {
          const msg = `Getting stats for User [${uuid}] from DB has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr
          })
        } else {
            resolve({
              code: 200,
              data: result
            })
        }
      }
    )

  })

}

/**
 * Add valid user's login token to DB
 * @param uuid UUID of the user
 * @param token Token to add
 * @returns Promise with results
*/
export function saveToken(uuid: string, token: string): Promise<GenericPromiseReturn> {

  return new Promise((resolve, reject) => {
    const sql = `
    INSERT INTO Token (
      uuid_user,
      token
    ) VALUES(
      $uuid,
      $token
    )
    ;`;
    const params = {
            $uuid: uuid,
            $token: token
          }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Saving Token [${token}] of User [${uuid}] to DB has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr
          })
        } else {
          resolve({
            code: 201,
            data: 'Token saved to DB'
          })
        }
      }
    )
  })

}

/**
 * Check if given token is logged-in by user (returns true) or is logged-out (returns false)
 * @param token Token to check
 * @returns Promise with results
*/
export function isTokenLoggedIn(token: string): Promise<GenericPromiseReturn> {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
      valid
    FROM
      Token
    WHERE
      token=$token
    ;`;
    const params = { $token: token }
    db.get(sql, params, function (error, row: { valid: number }) {
      if (error) {
        const msg = `Getting Token [${token}] state from DB has failed`;
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: serErr
        })
      } else if (!row) { // Token not found
        reject({
          code: 401,
          data: false
        })
      } else { // Token found
          if (row.valid === 1) { // User with this token did not logged out yet - so token is valid

            // Token is valid - resolve the promise
            resolve({
              code: 200,
              data: true
            })

          } else { // User with this token logged-out

            // Token is invalid - reject the promise
            reject({
              code: 401,
              data: false
            })
          }
        }
      }
    )
  })

}

/**
 * Change `logged_out` flag of given token to value 1
 * It means that given token is no longer valid because user logged out
 * @param token Token to logout
 * @returns Promise with results
*/
export function logoutToken(token: string): Promise<GenericPromiseReturn> {

  return new Promise((resolve, reject) => {

    // Token cookie is missing, user is probably already logged out
    if (!token) {
      resolve({
        code: 200,
        data: true
      })
    }

    const sql = `
    UPDATE
      Token
    SET
      valid = 0
    WHERE token=$token
    `;
    const params = { $token: token }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Token [${token}] invalidation in DB has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr
          })
        } else {

          if (this.changes === 1) { // Token invalidated successfully
            resolve({
              code: 200,
              data: true
            })
          } else {
            const msg = `Token [${token}] failed to SET to invalid`;
            logger.error(msg);
            reject({
              code: 500,
              data: 'Logout error'
            })
          }

        }
      }
    )

  })
}

/**
 * Get user's settings from DB
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function getSettings(uuid: string): Promise<GenericPromiseReturn> {

  interface GetSettingsResponse {
    code: number;
    data: {
      email: string;
      emailActive: number;
      emailUnsubscribed: number;
    };
  }

  return new Promise<GetSettingsResponse>((resolve, reject) => {
    const sql = `
      SELECT
        email,
        email_active,
        (SELECT email FROM Unsubscribed WHERE email = User.email) as email_unsubscribed
      FROM
        User
      WHERE
        uuid=$uuid
      ;`;
    const params = { $uuid: uuid }
    interface RowSettings {
      email: string;
      email_active: number;
      email_unsubscribed: number;
    };
    db.get(sql, params, function (error, row: RowSettings) {
        if (error) { // DB error occured
          const msg = `Getting Settings of User [${uuid}] from DB has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr,
          })
        } else if (!row) { // Row not found
          const msg = `Settings of User [${uuid}] not found in DB`;
          logger.error(`${msg}`);
          reject({
            code: 404,
            data: serErr,
          })
        } else {
            // Token is valid - resolve the promise
            resolve({
              code: 200,
              data: {
                email: row.email,
                emailActive: row.email_active,
                emailUnsubscribed: row.email_unsubscribed
              }
            })
        }
      }
    )
  })

}

/**
 * Get logs specified by `filter` argument in form of object with key-value pairs variables from query string
 * Validation of quert string should be done before this function is called
 * @param filter Filter object
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function getLogs(filter: LogFilterQuery, uuid: string): Promise<GenericPromiseReturn> {

  interface ConvertedRows {
    datetime: string;
    timestamp: number;
  }

  interface GetLogsResponse {
    code: number;
    data: ConvertedRows[];
    count: number;
  }

  return new Promise<GetLogsResponse>((resolve, reject) => {

    // Convert dates from input fields to unix epoch integer (ms)
    // Inputed `from` and `to` dates are `inclusive these dates` so we need to add extra 24 hours to the second one since both dates begin at `00:00:00` (at the start of the day)
    let dateFrom = (new Date(filter.datefrom)).getTime();
    let dateTo = (new Date(filter.dateto)).getTime() + (24*60*60*1000);

    // Select logs with specified status
    let selectedStatuses = [];

    if (filter.status0 === '1') {
      selectedStatuses.push(0);
    }
    if (filter.status1 === '1') {
      selectedStatuses.push(1);
    }

    let selectedWatchdogs = filter.watchdogs.split(',');

    const sql = `
      SELECT
        Watchdog_log.id,
        Watchdog_log.timestamp,
        Watchdog.name as watchdog,
        Watchdog_log.status,
        Watchdog_log.note
      FROM
        Watchdog_log,
        Watchdog
      WHERE
        Watchdog.uuid_user = $uuid AND
        Watchdog_log.id_watchdog = Watchdog.id AND
        id_watchdog IN (${selectedWatchdogs.map(() => '?').join(', ')}) AND
        status IN (${selectedStatuses.map(() => '?').join(', ')}) AND
        timestamp BETWEEN $dateFrom AND $dateTo
      ORDER BY timestamp DESC
      ;`;

    const params = [
      uuid,
      ...selectedWatchdogs,
      ...selectedStatuses,
      dateFrom,
      dateTo
    ]

    db.all(sql, params,
    function (error, rows) {
      if (error) {
        const msg = `Getting Logs from DB of User [${uuid}] has failed`;
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: false
        })
      } else {
        // Modify timestamp using the time conversion function
        const convertedRows = (rows as { timestamp: number }[]).map((row) => {
          if (typeof row === 'object' && row !== null) {
            return {
              ...row,
              datetime: getCurrentDateTimeUTC(row.timestamp),
            };
          }
          return row;
        });

        resolve({
          code: 200,
          data: convertedRows,
          count: rows.length
        })

      }
    })
  })
}

/**
 * Return self-logs as an array of objects
 * @returns Promise with results
*/
export function getSelfLogs(): Promise<GenericPromiseReturn> {

  interface Log {
    start: string;
    stop: string | null;
  }
  
  interface GetSelfLogsResponse {
    code: number;
    data: Log[];
  }

  return new Promise<GetSelfLogsResponse>((resolve, reject) => {

    let selfLogs = [];

    const sql = `
      SELECT
        start,
        stop
      FROM
        Self_log
      ;`;

    interface RowsSelfLogs {
      start: number;
      stop: number;
    }

    db.all(sql, function (error, rows: RowsSelfLogs[]) {
      if (error) {
        const msg = `Getting Self-log from DB has failed`;
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: false
        })
      } else if (rows.length === 0) {
        reject({
          code: 404,
          data: false
        })
      } else {

        // Creating array of self-logs with proper formating before sending it as response
        let selfLogs = [];
        for (let i = 0; i < rows.length; i++) {
          let lastStart = i ===  rows.length - 2 ? true : false;
          if (rows[i].start) {
            let log = {
              start: getCurrentDateTimeUTC(rows[i].start),
              stop: lastStart ? null : getCurrentDateTimeUTC(rows[i+1].stop)
            }
            selfLogs.push(log);
          }
          resolve({
            code: 200,
            data: selfLogs
          })

        }

      }
    })

  })

}

/**
 * Return resolved promise if no same email address already exists in User table
 * @param email Email to check
 * @returns Promise with results
*/
export function checkEmailDuplicity(email: string): Promise<GenericPromiseReturn> {

  return new Promise(async (resolve, reject) => {

    // When checking empty email address, evaluate it as non-duplicate email address
    if (email === '') {
      resolve({
        code: 200,
        data: 'ok'
      })
    }

    const sql = `
      SELECT
        COUNT(*) as duplicates
      FROM
        User
      WHERE
        email = $email
      ;`;
    const params = { $email: email }
    db.get(sql, params, function (error, row: { duplicates: number }) {
      if (error) {
        const msg = `Checking email address [${email}] for duplicity in DB has failed`;
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: serErr
        })
      } else if (row.duplicates === 0)  {
        resolve({
          code: 200,
          data: 'ok'
        })
      } else {
        const msg = `Email [${email}] duplicity found in DB`;
        logger.info(msg);
        reject({
          code: 400,
          data: 'Same email address already exists in database, please try different address'
        })
      }
    })

  })

}

/**
 * Get email address based on User uuid
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function getEmail(uuid: string): Promise<GenericPromiseReturn> {

  interface GetEmailResponse {
    code: number;
    data: string;
  }

  return new Promise<GetEmailResponse>((resolve, reject) => {
    const sql = 'SELECT email FROM User WHERE uuid = $uuid;';
    const params = {
      $uuid: uuid
    }
    db.get(sql, params, function (error, row: { email: string }) {
        if (error) {
          const msg = `Getting email for User [${uuid}] from DB has failed`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: 'Failed to get email'
          })
        } else if (!row) {
          const msg = `No email with for User [${uuid}] found in DB`;
          logger.error(msg);
          reject({
            code: 404,
            data: 'No email found'
          })
        } else {
            resolve({
              code: 200,
              data: row.email
            })
        }
      }
    )
  })

}

/**
 * Update user's settings
 * @param data Data to update
 * @param activationLinkSent Whether activation link was sent
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function updateSettings(data: Settings, activationLinkSent: boolean, uuid: string): Promise<GenericPromiseReturn> {

  interface UpdateSettingsResponse {
    code: number;
    data: string;
  }

  return new Promise<UpdateSettingsResponse>(async (resolve, reject) => {

    const sql = `
    UPDATE User SET
      email = $email,
      email_active = $emailActive,
      activation_key = CASE WHEN $newActivationKey THEN $activationKey ELSE activation_key END,
      unsubscribe_key = CASE WHEN $newUnsubscribeKey THEN $unsubscribeKey ELSE unsubscribe_key END
    WHERE
      uuid = $uuid
    ;`;
    const params = {
      $email: data.email === '' ? null : data.email,
      $emailActive: activationLinkSent ? 0 : 1,
      $newActivationKey: data.activationKey ? true : false,
      $newUnsubscribeKey: data.unsubscribeKey ? true : false,
      $activationKey: data.activationKey,
      $unsubscribeKey: data.unsubscribeKey,
      $uuid: uuid,
    }
    db.run(sql, params, async function (error) {
        if (error) {
          const msg = `DB update of Settings of User [${uuid}] has failed`;
          logger.error(`${msg} [${error.stack}]`);

          reject({
            code: 500,
            data: serErr
          })

        } else {
          resolve({
            code: 201,
            data: 'Settings changed'
          })
        }
      }
    )

  })

}

/**
 * Accept token string (usually from http cookie) and returns associated uuid
 * @param token Token to get UUID for
 * @returns Promise with results
*/
export function getUUIDbyToken(token: string) {

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        uuid_user
      FROM
        Token
      WHERE
        token = $token
      ;`;
      const params = { $token: token }
      let msg = `Getting UUID by Token [${token}] from DB has failed: `;
      db.get(sql, params, function (error, row: { uuid_user: string }) {
        if (error) {
          msg += `DB error`;
          logger.error(`${msg} [${error.stack}]`);
          reject({
            code: 500,
            data: serErr
          })
        } else if (!row) {
          msg += `no User has such Token [${token}]`;
          logger.error(msg);
          reject({
            code: 401,
            data: 'Invalid token'
          })
        } else {
          resolve(row.uuid_user)
        }
    })
  })

}

/**
 * Accept plaintext password from input form and returns associated uuid
 * @param password Password to get UUID for
 * @returns Promise with results
*/
export function getUUIDbyPassword(password: string) {

  return new Promise<string>((resolve, reject) => {
  const sql = 'SELECT uuid FROM User WHERE hash = $string;';
  const params = { $string: hash(password + JASMA_SALT) };
  const pwLength = password.length;
  let msg = `Getting UUID by password [length = ${pwLength}] from DB has failed: `;
    db.get(sql, params, function (error, row: { uuid: string }) {
      if (error) {
        msg += `DB error`;
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: 'Login error'
        })
      } else if (!row) {
        msg += `no user has such password`;
        logger.error(`${msg}`);
        reject({
          code: 401,
          data: 'Invalid password'
        })
      } else {
        resolve(row.uuid)
      }
    })
  })
}

/**
 * Resolve to object with property "data" to true if email address is activated
 * Resolve to object with property "data" to false if email address needs activation
 * Reject otherwise
 * @param email Email to check
 * @param uuid UUID of the user
 * @returns Promise with results
*/
export function isActivated(email: string, uuid: string): Promise<GenericPromiseReturn> {

  return new Promise((resolve, reject) => {

    // If no email provided, then no need to activate non-existent email
    if (email === '') {
      resolve({
        code: 200,
        data: false
      })
    }

    const sql = `
      SELECT
        email,
        email_active,
        activation_key
      FROM
        User
      WHERE
        email = $email AND
        uuid = $uuid
      ;`;
    const params = {
      $email: email,
      $uuid: uuid
    }
    let msg = `Email [${email}] activation status check for User [${uuid}] in DB has failed: `;
    db.get(sql, params, function (error, row) {
      if (error) {
        msg += `DB error`;
        logger.error(`${msg} [${error.stack}]`);
        reject({
          code: 500,
          data: msg
        })
      } else if (!row) { // No such email found, it means email is unique and needs to be activated
        msg += `no such email found`;
        resolve({
          code: 200,
          data: false
        })
      } else {
        resolve({ // Email was found, therefore activation link was already sent
          code: 200,
          data: true
        })
      }
    })

  })

}
