// import React environment variables from ".env" file
import dotenv from 'dotenv'
dotenv.config()

// logger
import { logger } from '../functions.js'

import { PARSE_INT_BASE, widLength, generateRandomString, msToWords } from '../../src/globals.js'
import { hash, generateUUID, saltedPwHash, generateActivationKeyUrl, generateUnsubscribeKeyUrl, generateWatchdogId, getCurrentDateTimeUTC, sendMail } from './../functions.js'

import sqlite3 from 'sqlite3'
const db = new sqlite3.Database('./backend/db/service_monitor.db')

const serErr = 'Server error' // generic error message

// returns resolved promise if given User is master or non-master with maximum amount of enabled Watchdogs not yet reached
export function checkMaxWatchdogs(uuid) {

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
    ;`
    const params = { $uuid: uuid }
    db.get(sql, params, function (error, row) {
        if (error) {
          const msg = `Getting Watchdog Count for User [${uuid}] from DB has failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: 'Failed to get Watchdog count'
          })
        } else if (!row) {
          const msg = `No Watchdog count returned for User [${uuid}] from DB`
          logger.error(msg)
          reject({
            code: 500,
            data: 'No Watchdog count returned'
          })
        } else if (row.count >= parseInt(process.env.JASMA_MAX_WATCHDOGS, PARSE_INT_BASE)) {
          reject({
            code: 400,
            data: `The maximum number of enabled Watchdogs has reached the limit of ${parseInt(process.env.JASMA_MAX_WATCHDOGS, PARSE_INT_BASE)}`
          })
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

// add email address to table of unsubscribed email addresses
export function unsubscribeEmail(key) {

  return new Promise((resolve, reject) => {

    const sql = `
    INSERT INTO Unsubscribed (
      email
    ) VALUES(
      (SELECT email FROM User WHERE unsubscribe_key = $key)
    )
    ;`
    const params = { $key: key }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Inserting unsubscribed email address to DB failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: serErr
          })
        } else {
          resolve({
            code: 201,
            data: 'Successfully unsubscribed'
          })
        }
      }
    )

  })

}

// activetes email address based on activation link (key)
export function activateEmail(key) {

  return new Promise((resolve, reject) => {

    const sql = `
    UPDATE
      User
    SET
      email_active = 1
    WHERE
      activation_key = $key
    ;`

    const params = { $key: key }

    db.run(sql, params, function (error) {
      if (error) {
        const msg = 'Email activation DB UPDATE failed. DB error.'
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: serErr
        })
      } else {
        if (this.changes !== 1) {
          const msg = `Email activation DB UPDATE failed. No changes.`
          logger.error(msg)
          reject({
            code: 400,
            data: 'Email address activation failed'
          })
        } else {
          const msg = 'Email address activated'
          logger.info(`${msg} [${key}]`)
          resolve({
            code: 201,
            data: msg
          })
        }
      }
    })

  })

}

// add new user to DB (for demo account => master=0)
export function addUser(data) {

  return new Promise((resolve, reject) => {

    const uuid = generateUUID()
    const password = generateRandomString(parseInt(process.env.JASMA_PW_LENGTH_USER, PARSE_INT_BASE))
    const salt = process.env.JASMA_SALT
    const hashedPw = saltedPwHash(password, salt)

    const sql = `
    INSERT INTO
      User (uuid, hash, master)
    VALUES ($uuid, $hashedPw, 0)
    ;`
    const params = {
      $uuid: uuid,
      $hashedPw: hashedPw
    }
    db.run(sql, params, function (error) { // Adding new User to DB
      if (error) {
        const msg = 'Inserting new User to DB failed.'
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: 'Creating new account failed',
        })
      } else { // User was added to DB

        // prepare data for new Watchdog
        const wid = generateWatchdogId()
        const data = {
          watchdogID: wid,
          url: 'https://www.example.com',
          name: 'Example.com',
          email_notif: 0,
          passive: 0,
          enabled: 1,
        }

        // add first testing Watchdog for new User
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
            const msg = `Testing Watchdog [${wid}] for User [${uuid}] failed to add to DB.`
            logger.error(msg)
            reject({
              code: 500,
              data: 'Watchdog adding for new user failed'
            })
          })
      }
    })

  })

}

// get "Watchdog" items of User
export function getWatchdogs(uuid) {

  return new Promise((resolve, reject) => {
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
    ;`
    const params = { $uuid: uuid }
    db.all(sql, params, function (error, result) {
        if (error) {
          const msg = `Getting Watchdogs from DB for uuid [${uuid}] has failed`
          logger.error(`${msg} [${error.stack}]`)
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

// get single "Watchdog" item
export function getWatchdog(id, uuid) {

  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM Watchdog WHERE id = $id AND uuid_user = $uuid;'
    const params = {
      $id: id,
      $uuid: uuid
    }
    db.get(sql, params, function (error, row) {
        if (error) {
          const msg = `Getting Watchdog [${id}] for User [${uuid}] from DB has failed`
          logger.error(`${msg} [${error.stack}]`)
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

// update single "Watchdog" item
export function updateWatchdog(id, data, uuid) {

  return new Promise((resolve, reject) => {
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
     ;`
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
          const msg = `Updating Watchdog [${id}] in DB for User [${uuid}] failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: serErr
          })
        } else {
          const msg = `Watchdog [${id}] in DB for User [${uuid}] was updated`
          logger.info(msg)
          resolve({
            code: 201,
            data: `The "${data.name}" watchdog has been successfully updated. The changes will take effect in the next monitoring cycle, which may take up to ${msToWords(parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE))}.`
          })
        }
      }
    )
  })
}

// delete single "Watchdog" item
export function deleteWatchdog(id, uuid) {

  return new Promise((resolve, reject) => {
    const sql = `
    DELETE
    FROM
    Watchdog
    WHERE
      id = $id AND
      uuid_user = $uuid
    ;`
    const params = {
      $id: id,
      $uuid: uuid
    }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Deleting Watchdog [${id}] of User [${uuid}] from DB failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: null
          })
        } else {
            resolve({
              code: 204,
              data: null
            })
        }
      }
    )
  })

}

// checks for diplicity in Watchdog "name" and "url"
// same uuid should not contain multiple Watchdogs with same name or url endpoint*
// *with exception of "passive mode" Watchdog item, where all urls are set to NULL
export function checkWatchdogDuplicity(name, url, uuid) {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
      COUNT(id) as count
    FROM
      Watchdog
    WHERE
      uuid_user = $uuid AND
      (name = $name OR (url = $url AND passive = 0))
    ;`
    const params = {
      $uuid: uuid,
      $name: name,
      $url: url
    }
    let msg = `DB duplicity Watchdog name [${name}] and url [${url}] of User [${uuid}] check failed: `
    db.get(sql, params, function (error, row) {
      if (error) {
        msg += 'DB error'
        logger.error(`${msg} [${error.stack}]`)
        reject({
          date: serErr,
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
        if (row['count'] === 0) { // ok, no duplicates found
          resolve()
        } else { // not ok - duplicates found
          reject({
            data: 'Same name and/or URL already exists',
            code: 400
          })
        }
      }
    })
  })

}

// adds single "Watchdog" item
export function addWatchdog(data, uuid) {

  return new Promise((resolve, reject) => {

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
    );`

    // passive mode Watchdogs use pre-generated ID from hidden <input> element at frontend side
    const wid = data.passive === 1 ? data.wid : generateWatchdogId(widLength)

    const params = {
      $id: wid,
      $uuid: uuid,
      $url: data.passive === 1 ? null : data.url, // passive mode Watchdogs do not have URL
      $name: data.name,
      $email_notif: data.email_notif,
      $threshold: data.threshold,
      $passive: data.passive,
      $enabled: data.enabled,
    }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Adding new Watchdog to DB for user [${uuid}] has failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: 'Database error'
          })
        } else {
          logger.info(`New Watchdog ID [${wid}] with name [${data.name}] has been added to DB`)
          resolve({
            code: 201,
            data: `New watchdog "${data.name}" added`
          })
        }
      }
    )

  })
}

// gets basic stats for homepage
export function getStats(uuid) {

  return new Promise((resolve, reject) => {

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
      ;`

    const params = {
      $interval: parseInt(process.env.REACT_APP_REPEAT_DELAY, PARSE_INT_BASE),
      $uuid: uuid,
      $timestampNow: Date.now()
    }

    db.all(sql, params, function (error, result) {
        if (error) {
          const msg = `Getting stats for User [${uuid}] from DB has failed`
          logger.error(`${msg} [${error.stack}]`)
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

// adds valid user's login token to DB
export function saveToken(uuid, token) {

  return new Promise((resolve, reject) => {
    const sql = `
    INSERT INTO Token (
      uuid_user,
      token
    ) VALUES(
      $uuid,
      $token
    )
    ;`
    const params = {
            $uuid: uuid,
            $token: token
          }
    db.run(sql, params, function (error) {
        if (error) {
          const msg = `Saving Token [${token}] of User [${uuid}] to DB has failed`
          logger.error(`${msg} [${error.stack}]`)
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

// checks if given token is logged-in by user (returns true) or is logged-out (returns false)
export function isTokenLoggedIn(token) {

  return new Promise((resolve, reject) => {
    const sql = `
    SELECT
      valid
    FROM
      Token
    WHERE
      token=$token
    ;`
    const params = { $token: token }
    db.get(sql, params, function (error, row) {
      if (error) {
        const msg = `Getting Token [${token}] state from DB has failed`
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: serErr
        })
      } else if (!row) { // token not found
        reject({
          code: 401,
          data: false
        })
      } else { // token found
          if (row.valid === 1) { // user with this token did not logged out yet - so token is valid

            // token is valid - resolve the promise
            resolve({
              code: 200,
              data: true
            })

          } else { // user with this token logged-out

            // token is invalid - reject the promise
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

// change "logged_out" flag of given token to value 1
// it means that given token is no longer valid because user logged out
export function logoutToken(token) {

  return new Promise((resolve, reject) => {

    // token cookie is missing, user is probably already logged out
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
    WHERE token=$token`
    const params = { $token: token }
    db.run(sql, params, function (error, row) {
        if (error) {
          const msg = `Token [${token}] invalidation in DB has failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: serErr
          })
        } else {

          if (this.changes === 1) { // token invalidated successfully
            resolve({
              code: 200,
              data: true
            })
          } else {
            const msg = `Token [${token}] failed to SET to invalid`
            logger.error(msg)
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

// gets user's settings from DB
export function getSettings(uuid) {

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        email,
        email_active,
        (SELECT email FROM Unsubscribed WHERE email = User.email) as email_unsubscribed
      FROM
        User
      WHERE
        uuid=$uuid
      ;`
    const params = { $uuid: uuid }
    db.get(sql, params, function (error, row) { // DB error occured
        if (error) {
          const msg = `Getting Settings of User [${uuid}] from DB has failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: serErr,
          })
        } else if (!row) { // row not found
          const msg = `Settings of User [${uuid}] not found in DB`
          logger.error(`${msg}`)
          reject({
            code: 404,
            data: serErr,
          })
        } else {
            // token is valid - resolve the promise
            resolve({
              code: 200,
              data: {
                email: row['email'],
                emailActive: row['email_active'],
                emailUnsubscribed: row['email_unsubscribed'],
              }
            })
        }
      }
    )
  })

}

// get logs specified by "filter" argument in form of object with key-value pairs variables from query string
// validation of quert string should be done before this function is called
export function getLogs(filter, uuid) {
  return new Promise((resolve, reject) => {

    // convert dates from input fields to unix epoch integer (ms)
    // inputed "from" and "to" dates are "inclusive these dates" so we need to add extra 24 hours to the second one since both dates begin at "00:00:00" (at the start of the day)
    let dateFrom = (new Date(filter.datefrom)).getTime()
    let dateTo = (new Date(filter.dateto)).getTime() + (24*60*60*1000)

    // select logs with specified status
    let selectedStatuses = []

    if (filter.status0 === '1') {
      selectedStatuses.push(0)
    }
    if (filter.status1 === '1') {
      selectedStatuses.push(1)
    }

    let selectedWatchdogs = filter.watchdogs.split(',')

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
      ;`

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
        const msg = `Getting Logs from DB of User [${uuid}] has failed`
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: false
        })
      } else {

        // Modify timestamp using the time conversion function
        const convertedRows = rows.map(row => ({
          ...row,
          datetime: getCurrentDateTimeUTC(row.timestamp),
        }))

        resolve({
          code: 200,
          data: convertedRows,
          count: rows.length
        })

      }
    })
  })
}

// returns self-logs as an array of objects
export function getSelfLogs() {

  return new Promise((resolve, reject) => {

    let selfLogs = []

    const sql = `
      SELECT
        start,
        stop
      FROM
        Self_log
      ;`

    db.all(sql, function (error, rows) {
      if (error) {
        const msg = `Getting Self-log from DB has failed`
        logger.error(`${msg} [${error.stack}]`)
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

        // creating array of self-logs with proper formating before sending it as response
        let selfLogs = []
        for (let i = 0; i < rows.length; i++) {
          let lastStart = i ===  rows.length - 2 ? true : false
          if (rows[i].start) {
            let log = {
              start: getCurrentDateTimeUTC(rows[i].start),
              stop: lastStart ? null : getCurrentDateTimeUTC(rows[i+1].stop)
            }
            selfLogs.push(log)
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

// returns resolved promise if no same email address already exists in User table
export function checkEmailDuplicity(email) {

  return new Promise(async (resolve, reject) => {

    // when checking empty email address, evaluate it as non-duplicate email address
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
      ;`
    const params = { $email: email }
    db.get(sql, params, function (error, row) {
      if (error) {
        const msg = `Checking email address [${email}] for duplicity in DB has failed`
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: serErr
        })
      } else if (row['duplicates'] === 0)  {
        resolve({
          code: 200,
          data: 'ok'
        })
      } else {
        const msg = `Email [${email}] duplicity found in DB`
        logger.info(msg)
        reject({
          code: 400,
          data: 'Same email address already exists in database, please try different address'
        })
      }
    })

  })

}

// gets email address based on User uuid
export function getEmail(uuid) {

  return new Promise((resolve, reject) => {
    const sql = 'SELECT email FROM User WHERE uuid = $uuid;'
    const params = {
      $uuid: uuid
    }
    db.get(sql, params, function (error, row) {
        if (error) {
          const msg = `Getting email for User [${uuid}] from DB has failed`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: 'Failed to get email'
          })
        } else if (!row) {
          const msg = `No email with for User [${uuid}] found in DB`
          logger.error(msg)
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

// updates user's settings
export function updateSettings(data, activationLinkSent, uuid) {

  return new Promise(async (resolve, reject) => {

    const sql = `
    UPDATE User SET
      email = $email,
      email_active = $emailActive
      activation_key = CASE WHEN $newActivationKey THEN $activationKey ELSE activation_key END,
      unsubscribe_key = CASE WHEN $newUnsubscribeKey THEN $unsubscribeKey ELSE unsubscribe_key END
    WHERE
      uuid = $uuid
    ;`
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
          const msg = `DB update of Settings of User [${uuid}] has failed`
          logger.error(`${msg} [${error.stack}]`)

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

// accepts token string (usually from http cookie) and returns associated uuid
export function getUUIDbyToken(token) {

  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        uuid_user
      FROM
        Token
      WHERE
        token = $token
      ;`
      const params = { $token: token }
      let msg = `Getting UUID by Token [${token}] from DB has failed: `
      db.get(sql, params, function (error, row) {
        if (error) {
          msg += `DB error`
          logger.error(`${msg} [${error.stack}]`)
          reject({
            code: 500,
            data: serErr
          })
        } else if (!row) {
          msg += `no User has such Token [${token}]`
          logger.error(msg)
          reject({
            code: 401,
            data: 'Invalid token'
          })
        } else {
          resolve(row['uuid_user'])
        }
    })
  })

}

// accepts plaintext password from input form and returns associated uuid
export function getUUIDbyPassword(password) {
  return new Promise((resolve, reject) => {
  const sql = 'SELECT uuid FROM User WHERE hash = $string;'
  const params = { $string: hash(password + process.env.JASMA_SALT) }
  const pwLength = password.length
  let msg = `Getting UUID by password [length = ${pwLength}] from DB has failed: `
    db.get(sql, params, function (error, row) {
      if (error) {
        msg += `DB error`
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: 'Login error'
        })
      } else if (!row) {
        msg += `no user has such password`
        logger.error(`${msg}`)
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

// resolves to object with property "data" to true if email address is activated
// resolves to object with property "data" to false if email address needs activation
// rejects otherwise
export function isActivated(email, uuid) {

  return new Promise((resolve, reject) => {

    // if no email provided, then no need to activate non-existent email
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
      ;`
    const params = {
      $email: email,
      $uuid: uuid
    }
    let msg = `Email [${email}] activation status check for User [${uuid}] in DB has failed: `
    db.get(sql, params, function (error, row) {
      if (error) {
        msg += `DB error`
        logger.error(`${msg} [${error.stack}]`)
        reject({
          code: 500,
          data: msg
        })
      } else if (!row) { // no such email found, it means email is unique and needs to be activated
        msg += `no such email found`
        resolve({
          code: 200,
          data: false
        })
      } else {
        resolve({ // email was found, therefore activation link was already sent
          code: 200,
          data: true
        })
      }
    })

  })

}
