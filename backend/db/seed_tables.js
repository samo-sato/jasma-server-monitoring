// tables have to be created first, there is another script for that
// this code seeds app's tables with sample data for testing

const path = require('path')
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database(path.resolve(__dirname, 'service_monitor.db'))

db.serialize(function () {

  // add default parameters to "Parameter" table
  db.run(`INSERT INTO "Parameter" (name, value, unit) VALUES ("scanning_interval", 10000, "ms"), ("token_expiration", 3600, "s");`, function (error) {
    if (error) {
      console.log(error)
    } else {
      console.log(`Data inserted into "Parameter" table`)
    }
  })

  // add sample "Watchdog" monitoring agent to "Watchdog" table
  db.run(`INSERT INTO "Watchdog" (private_id, name, url, passive, email_notif, enabled) VALUES ("gI7qCK7z", "Example", "https://www.example.org", 0, 0, 1);`, function (error) {
    if (error) {
      console.log(error)
    } else {
      console.log(`Data inserted into "Watchdog" table`)
    }
  })

})
