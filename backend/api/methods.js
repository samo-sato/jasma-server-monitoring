const path = require('path')
const { constants } = require(path.resolve(__dirname, '..', '..', 'src', 'constants')) // some general parameters

const sqlite3 = require('sqlite3')
const db = new sqlite3.Database(path.resolve(__dirname, '..', 'db', 'service_monitor.db'))

// methods for manipulating data in DB (CRUD)
// part of backend API
const handleDB = {

  // get items from "Watchdog" table
  getWatchdogs: function () {
    return new Promise((resolve, reject) => {
      db.all(
`SELECT
  Watchdog.*,
  MAX(Watchdog_log.timestamp) as last_log_at,
  Watchdog_log.status as last_status,
  Watchdog_log.note as last_note
FROM Watchdog
LEFT JOIN Watchdog_log
ON Watchdog.id = Watchdog_log.id_watchdog
GROUP BY Watchdog.id;`,
        function (err, result) {
          if (err) {
            reject({
              code: 500,
              data: err.message
            })
          } else {
            // artificial delay for testing - remove before flight
            // setTimeout(() => {
              resolve({
                code: 200,
                data: result
              })
            // }, 1000)
          }
        }
      )
    })
  },

  // get single item from "Watchdog" table
  getWatchdog: function (id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM Watchdog WHERE id = $id;',
        { $id: id },
        function (err, row) {
          if (err) {
            reject({
              code: 500,
              data: err.message
            })
          } else if (!row) {
            reject({
              code: 404,
              data: 'No item with given id retrieved'
            })
          } else {
            // artificial delay for testing - remove before flight
            // setTimeout(() => {
              resolve({
                code: 200,
                data: row
              })
            // }, 1000)
          }
        }
      )
    })
  },

  // update single item from "Watchdog" table
  updateWatchdog: function (id, data) {

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE Watchdog SET
          name = $name,
          url = $url,
          email_notif = $email_notif,
          passive = $passive,
          enabled = $enabled
         WHERE id = $id;`,
        {
          $id: Number(id),
          $url: data.url,
          $name: data.name,
          $email_notif: data.email_notif,
          $passive: data.passive,
          $enabled: data.enabled
        },
        function (err) {
          if (err) {
            reject({
              code: 500,
              data: err.message
            })
          } else {
            // artificial delay for testing - remove before flight
            // setTimeout(() => {
              resolve({
                code: 201,
                data: `Watchdog \"${data.name}\" updated successfully`
              })
            // }, 1000)
          }
        }
      )
    })
  },

  // delete single item from "Watchdog" table
  deleteWatchdog: function (id) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM Watchdog WHERE id = $id;`,
        { $id: Number(id) },
        function (err) {
          if (err) {
            reject({
              code: 500,
              data: null
            })
          } else {
            // artificial delay for testing - remove before flight
            // setTimeout(() => {
              resolve({
                code: 204,
                data: null
              })
            // }, 1000)
          }
        }
      )
    })
  },

  // add single item from "Watchdog" table
  addWatchdog: function (data) {

    return new Promise((resolve, reject) => {
      // generate "private_id" first
      privateIdGenerator.generate()
        .then(privateId => { // after obtaining unique "private_id" continue adding item to the table
          db.run(
            `INSERT INTO Watchdog (
              private_id,
              name,
              url,
              email_notif,
              passive,
              enabled
            ) VALUES(
              $private_id,
              $name,
              $url,
              $email_notif,
              $passive,
              $enabled
            );`,
            {
              $private_id: privateId,
              $url: data.url,
              $name: data.name,
              $email_notif: data.email_notif,
              $passive: data.passive,
              $enabled: data.enabled
            },
            function (err) {
              if (err) {
                reject({
                  code: 500,
                  data: err.message
                })
              } else {
                // artificial delay for testing - remove before flight
                // setTimeout(() => {
                  resolve({
                    code: 201,
                    data: `New watchdog \"${data.name}\" added`
                  })
                // }, 1000)
              }
            }
          )
        })
        .catch(reject => {
          const errMsg = 'Generating private ID failed'
          reject({
            code: 500,
            data: errMsg
          })
          throw new Error(errMsg)
        })
    })
  },

  // get basic stats for homepage
  getStats: function () {
    return new Promise((resolve, reject) => {

          db.all(`
            SELECT
            	Watchdog.name as watchdog,
            CASE
              WHEN Watchdog_log.status = 1 AND Watchdog_log.timestamp >= ((strftime('%s')*1000) - (SELECT value AS scan_interval FROM Parameter WHERE name = 'scanning_interval')) THEN 1
              ELSE 0
            END AS is_online
            FROM
            	Watchdog,
            	Watchdog_log
            WHERE
            	Watchdog.enabled = 1 AND
            	Watchdog.id = Watchdog_log.id_watchdog
            GROUP BY Watchdog.id
            HAVING MAX(Watchdog_log.timestamp);`,
            function (err, result) {
              if (err) {
                reject({
                  code: 500,
                  data: err.message
                })
              } else {
                // artificial delay for testing - remove before flight
                // setTimeout(() => {
                  resolve({
                    code: 200,
                    data: result
                  })
                // }, 1000)
              }
            }
          )
    })
  },

  // add valid login token to DB
  saveToken: function (token) {

    return new Promise((resolve, reject) => {

      db.run(
        `INSERT INTO Token (
          token
        ) VALUES(
          $token
        );`,
        {
          $token: token
        },
        function (err) {
          if (err) {
            reject({
              code: 500,
              data: err.message
            })
          } else {
            resolve({
              code: 201,
              data: true
            })
          }
        }
      )
    })

  },

  // checks if given token is logged-in by user (returns true) or is logged-out (returns false)
  isTokenLoggedIn: function (token) {

    return new Promise((resolve, reject) => {

      db.get(
        `SELECT logged_in FROM Token WHERE token=$token`,
        {
          $token: token
        },
        function (err, row) { // DB error occured
          if (err) {
            reject({
              code: 500,
              data: err.message
            })
          } else if (!row) { // token not found
            reject({
              code: 401,
              data: false
            })
          } else { // token found
            if (row["logged_in"] === 1) { // user with this token did not logged out yet - so token is valid

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
  },

  // change "logged_out" flag of given token to value 1
  // it means that given token is no longer valid because user logged out
  logoutToken: function (token) {

    return new Promise((resolve, reject) => {

      db.run(
        `UPDATE Token SET logged_in = 0 WHERE token=$token`,
        {
          $token: token
        },
        function (err, row) {
          if (err) {
            console.log(err.message)
            reject({
              code: 500,
              data: false
            })
          } else {

            if (this.changes === 1) { // token invalidated successfully
              resolve({
                code: 200,
                data: true
              })
            } else {
              reject({
                code: 500,
                data: false
              })
            }

          }
        }
      )

    })
  },

  // get app's parameters from DB
  // returns object with parameters in which keys = parameter name, values = values
  getParams: function () {
    return new Promise((resolve, reject) => {
      let params = {}
      db.each('SELECT name, value FROM Parameter;',
      function (error, row) { // executes on each row
        if (error) {
          console.log(err.message)
          reject({
            code: 500,
            data: false
          })
        } else {
          params[row.name] = row.value // row result
        }
      },
      function (error, rowCount) { // executes on complete
        if (error) {
          console.log(err.message)
          reject({
            code: 500,
            data: false
          })
        } else if (rowCount === 0) {
          console.log('No results')
          reject({
            code: 404,
            data: false
          })
        } else {
          // artificial delay for testing - remove before flight
          // setTimeout(() => {
            //console.log(params)
            resolve({
              code: 200,
              data: params
            })
          // }, 1000)
        }
      })
    })
  },

  // get logs specified by "filter" argument in form of object with key-value pairs variables from query string
  // validation of quert string should be done before this function is called
  getLogs: function (filter) {
    return new Promise((resolve, reject) => {

      // convert dates from input fields to unix epoch integer (ms)
      // inputed "from" and "to" dates are "inclusive these dates" so we need to add extra 24 hours to the second one since both dates begin at "00:00:00" (at the start of the day)
      let dateFrom = (new Date(filter.datefrom)).getTime()
      let dateTo = (new Date(filter.dateto)).getTime() + (24*60*60*1000)

      // select logs with specified status
      let selectedStatus = ''
      if (filter.status0 === '1') {
        selectedStatus += '0'
      }
      if (filter.status1 === '1') {
        if (selectedStatus.length > 0) { // add separator if other value already in the list
          selectedStatus += ','
        }
        selectedStatus += '1'
      }

      let selectedWatchdogs = filter.watchdogs ? filter.watchdogs : ''

      let sql = `
SELECT
	Watchdog_log.id,
	datetime(Watchdog_log.timestamp/1000, 'unixepoch') as datetime,
	Watchdog.name as watchdog,
	Watchdog_log.status,
	Watchdog_log.note
FROM
	Watchdog_log,
	Watchdog
WHERE
	Watchdog_log.id_watchdog = Watchdog.id
  AND id_watchdog IN (${selectedWatchdogs})
  AND status IN (${selectedStatus})
  AND timestamp BETWEEN ${dateFrom} AND ${dateTo}
  ;`

      db.all(sql,
      function (error, rows) { // executes on complete
        if (error) {
          console.log(error.message)
          reject({
            code: 500,
            data: false
          })
        } else {
          // artificial delay for testing - remove before flight
          //setTimeout(() => {

            resolve({
              code: 200,
              data: rows,
              count: rows.length
            })

          //}, 1000)
        }
      })
    })
  },

  // return object with self logs formated for app UI
  getSelfLogs: function () {
    return new Promise((resolve, reject) => {
      let selfLogs = []
      db.all('SELECT start, stop FROM Self_log;',
      function (error, rows) { // executes on complete
        if (error) {
          console.log(error.message)
          reject({
            code: 500,
            data: false
          })
        } else if (rows.length === 0) {
          console.log('No results')
          reject({
            code: 404,
            data: false
          })
        } else {
          // artificial delay for testing - remove before flight
          // setTimeout(() => {

            let selfLogs = []
            for (let i = 0; i < rows.length; i++) {
              let lastStart = i ===  rows.length - 2 ? true : false
              if (rows[i].start) {
                let log = {
                  start: convertDate(rows[i].start),
                  stop: lastStart ? null : convertDate(rows[i+1].stop)
                }
                selfLogs.push(log)
              }
            }

            //console.log(params)
            resolve({
              code: 200,
              data: selfLogs
            })


          // }, 1000)
        }
      })
    })
  },

  // update app's parameters
  updateParams: function (params) {
    return new Promise((resolve, reject) => {
      db.run(`
UPDATE Parameter
SET value = (CASE
WHEN name = 'scanning_interval' THEN $scanningInterval
WHEN name = 'token_expiration' THEN $tokenExpiration
ELSE name END)
WHERE name IN ('scanning_interval', 'token_expiration')
;`,
        {
          $scanningInterval: params.scanning_interval,
          $tokenExpiration: params.token_expiration
        },
        function (err) {
          if (err) {
            reject({
              code: 500,
              data: err.message
            })
          } else {
            // artificial delay for testing - remove before flight
            // setTimeout(() => {
              resolve({
                code: 201,
                data: 'Parameters saved'
              })
            // }, 1000)
          }
        }
      )
    })
  },

  // add self log to DB
  // "self logs" are logs that indicate if main app's backend is running or not
  writeSelfLog: function (isAfterOutage) {
    return new Promise((resolve, reject) => {

      const timestamp = Date.now()

      // running after app's backend outage
      if (isAfterOutage) { // add 2 logs, first log indicating that app's backend started and second indicating that app's backend stopped working (this log will be updated in future runs with fresh timestamp until something breaks and the "stop" timestamp remains indicating when it broke)
        db.run('INSERT INTO Self_log (start, stop) VALUES ($timestamp, null), (null, $timestamp);',
        { $timestamp: timestamp },
        function (err) {
          if (err) {
            reject(err.message)
          } else {
            resolve(`Self logging: added two self logs with "start" and "stop" status with timestamp ${timestamp}`)
          }
        })
      } else { // updating "stop" timestamp with fresh timestamp
        db.run('UPDATE Self_log SET stop = $timestamp WHERE id = (SELECT MAX(id) FROM Self_log);',
        { $timestamp: timestamp },
        function (err) {
          if (err) {
            reject(err.message)
          } else {
            resolve(`Self logging: updated "stop" status log with current timestamp ${timestamp}`)
          }
        })
      }

    })
  }

}

// methods for validating different form inputs
// returns true if validation passed
// returns string or array of strings with error message(s) if otherwise
const validate = {

  // validates "Watchdog" data
  // returns data if ok
  // returns false if not ok
  watchdog: function (data) {

    // input data preparation
    let name = data.name
    let url = data.url
    let enabled = data.enabled
    let email_notif = data.email_notif
    let passive = data.passive

    let errors = []

    // input type validation
    if (
      typeof name !== 'string' ||
      typeof url !== 'string' ||
      (enabled !== 0 && enabled !== 1) ||
      (email_notif !== 0 && email_notif !== 1) ||
      (passive !== 0 && passive !== 1)
    ) {
      return 'Invalid input type'
    }

    // input length validation
    if (name < constants.minWatchdogNameLength) {
      errors.push(`Minimum watchdog name length is ${constants.minWatchdogNameLength}`)
    }
    if (name > constants.maxWatchdogNameLength) {
      errors.push(`Maximum watchdog name length is ${constants.maxWatchdogNameLength}`)
    }
    if (url < constants.minWatchdogUrlLength) {
      errors.push(`Minimum watchdog url length is ${constants.minWatchdogUrlLength}`)
    }
    if (url > constants.maxWatchdogUrlLength) {
      errors.push(`Maximum watchdog url length is ${constants.maxWatchdogUrlLength}`)
    }

    return errors.length > 0 ? errors : true
  },

  // validate app's paramaters (before update)
  params: function (data) {

    // test is inputs only contain numerical [0-9] characters as strings
    let regex = /^[0-9]+$/
    if (!regex.test(data.scanning_interval) || !regex.test(data.token_expiration)) {
      return 'Only numerical characters are accepted'
    }

    let errors = []

    // convert string digits to integer digits
    let scanningInterval = Number(data.scanning_interval)
    let tokenExpiration = Number(data.token_expiration)

    if (scanningInterval < constants.minScanningInterval) {
      errors.push(`Minimum scanning interval is ${constants.minScanningInterval}`)
    }

    if (scanningInterval > constants.maxScanningInterval) {
      errors.push(`Maximum scanning interval is ${constants.maxScanningInterval}`)
    }

    if (tokenExpiration < constants.minTokenExpiration) {
      errors.push(`Minimum token expiration is ${constants.minTokenExpiration}`)
    }

    if (tokenExpiration > constants.maxTokenExpiration) {
      errors.push(`Maximum token expiration is ${constants.maxTokenExpiration}`)
    }

    return errors.length > 0 ? errors : true

  },

  // validate "req.query" object provided to API endpoint for searching logs using constraints defined in query
  logFilter: function (query) {

    let errors = []

    // checking for required date(s) variable
    if (!query.datefrom) {
      errors.push('Missing "from" date')
    }

    // checking for required date(s) variable
    if (!query.dateto) {
      errors.push('Missing "to" date')
    }

    // checking for required query variables
    if (!query.status0 || !query.status1) {
      errors.push('Missing status variable(s)')
    }

    // type validation
    let regex = /^\d{4}-\d{2}-\d{2}$/ // regex for date validation in format "YYYY-MM-DD"
    if (
      typeof query.datefrom !== 'string' ||
      typeof query.dateto !== 'string' ||
      !regex.test(query.datefrom) ||
      !regex.test(query.dateto) ||
      typeof query.status0 !== 'string' ||
      typeof query.status1 !== 'string' ||
      typeof query.watchdogs !== 'string'
    ) {
      errors.push('Invalid type')
    }

    // at least one Watchdog should be selected
    if (query.watchdogs.length === 0) {
      errors.push('At least one Watchdog should be selected')
    }

    // at least one status type should be selected
    if (query.status0 === '0' && query.status1 === '0') {
      errors.push('At least one status type should be selected')
    }

    // validate Watchdog list passed to query string as digits separated by commas
    regex = /^([0-9]+(,[0-9]+)*)?$/ // regex that should match string only containing digits "0-9" and/or commas "," but not commas alone
    if (!regex.test(query.watchdogs)) {
      errors.push('Query Watchdog list invalid')
    }

    // date conversion: from "YYYY-MM-DD" format to unix epoch time integer (ms)
    const newDateFrom = new Date(query.datefrom)
    const newDateTo = new Date(query.dateto)
    const dateFrom = newDateFrom.getTime()
    const dateTo = newDateTo.getTime()

    // date comparison validation ("date from" must be less or equal than "date to")
    if (dateFrom > newDateTo) {
      errors.push('"From" date must be smaller or equal than "To" date')
    }

    return errors.length > 0 ? errors : true
  }

}

// methods needed to generate unique "private_id" for item in "Watchdog" table
// intention is to use "private_id" as another Watchdog id consisting of random characters rather then id assigned by database (safety reasons)
const privateIdGenerator = {
  // get current length of longest "privateId" in table
  getMaxPrivateIdLength: function () {
    return new Promise((resolve, reject) => {
      db.get('SELECT LENGTH(private_id) as maxl FROM Watchdog ORDER BY LENGTH(private_id) DESC LIMIT 1;', function (error, row) {
        if (error) {
          reject(error.message) // sql error
        } else if (!row) {
          resolve(0) // default max length, if not results returned
        } else {
          resolve(row.maxl) // current max length
        }
      })
    })
  },

  // checks for "privateId" duplicity in "Watchdog" table
  checkPrivateIdDuplicity: function (privateId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as dupl FROM Watchdog WHERE private_id = $privateId;',
      { $privateId: privateId },
      function (error, row) {
        if (error) {
          reject(error.message)
        } else {
          resolve(row.dupl) // number of duplicities
        }
      })
    })
  },

  // returns random sequence of characters from the list in defined "length"
  // returned value is typeof string
  generateRandomString: function (length) {
    // list of characters for generating "PrivateId"
    const charList = [
      "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
    ]

    let result = []
    for (let i = 0; i < length; i++) {
      const randomCharIndex = Math.floor(Math.random() * charList.length) // generating random index for given list of characters
      const randomChar = charList[randomCharIndex] // picking random character from given list
      result.push(randomChar) // adding random character to result array
    }
    return result.join('')
  },

  // main method
  // generates unique "private_id" value for "Watchdog" table item
  generate: function () {
    return new Promise((resolve, reject) => {
      this.getMaxPrivateIdLength() // getting current length of longest "privateId" in table
        .then(currentMaxLength => {
          const minLength = 8 // minimum length of "privateId" that is used in URLs for passive watchdogs
          let length = currentMaxLength < minLength ? minLength : currentMaxLength // setting length of generated "privateId", it has to be equal at least "minLength"
          let privateId = this.generateRandomString(length)
          this.checkPrivateIdDuplicity(privateId)
            .then(duplicities => {
              if (duplicities === 0) {
                // resolving to final value
                resolve(privateId)
              } else { // duplicity was found
                // adding extra character to "private_id"
                const extraChar = this.generateRandomString(1)
                resolve(`${privateId}${extraChar}`)
              }
            })
            .catch(errorMsg => {
              throw new Error(errorMsg)
            })
        })
        .catch(errorMsg => {
          throw new Error(errorMsg)
        })
    })
  }

}

// convert UNIX epoch time (ms) to string date in predefined user friendly format
function convertDate(timestamp) {
  let dt = new Date(timestamp);

  let year = dt.getUTCFullYear();
  let month = (dt.getUTCMonth() + 1).toString().padStart(2, '0');
  let day = dt.getUTCDate().toString().padStart(2, '0');
  let hours = dt.getUTCHours().toString().padStart(2, '0');
  let minutes = dt.getUTCMinutes().toString().padStart(2, '0');
  let seconds = dt.getUTCSeconds().toString().padStart(2, '0');

  let formattedDate = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;

  return formattedDate;

}

module.exports = { handleDB, privateIdGenerator, validate, convertDate }
