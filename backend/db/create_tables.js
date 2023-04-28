// this code creates empty DB tables necessary to run the app
// if particular table already exists, it will not be created
// used DB system: sqlite3

const path = require('path')
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database(path.resolve(__dirname, 'service_monitor.db'))

// array of objects with names and schema sql for each table
const tableData = [
  {
    // table "Parameter" will contain some of the parameters that web app uses and these parameters could be modified by the user via web admin
    name: 'Parameter',
    sql: `
    CREATE TABLE IF NOT EXISTS "Parameter" (
    	"name"	TEXT NOT NULL UNIQUE,
    	"value"	INTEGER NOT NULL,
    	"unit"	TEXT
    );`
  },
  {
    // table "Watchdog" will contain "Watchdogs" which represent server monitoring agents, each Watchdog monitors specific url endpoint of service or server
    name: 'Watchdog',
    sql: `
    CREATE TABLE IF NOT EXISTS "Watchdog" (
    	"id"	INTEGER,
    	"private_id"	TEXT NOT NULL UNIQUE,
    	"name"	TEXT NOT NULL UNIQUE,
    	"url"	TEXT UNIQUE,
    	"passive"	INTEGER NOT NULL,
    	"email_notif"	INTEGER NOT NULL,
    	"enabled"	INTEGER NOT NULL,
    	PRIMARY KEY("id")
    );`
  },
  {
    // table "Watchdog_log" will contain logs with results from server monitoring from each Watchdog
    name: 'Watchdog_log',
    sql: `
    CREATE TABLE IF NOT EXISTS "Watchdog_log" (
    	"id"	INTEGER,
    	"batch"	DATE NOT NULL,
    	"timestamp"	DATE NOT NULL,
    	"id_watchdog"	INTEGER NOT NULL,
    	"status"	INTEGER NOT NULL,
    	"note"	TEXT,
    	FOREIGN KEY("id_watchdog") REFERENCES "Watchdog"("id"),
    	PRIMARY KEY("id")
    );`
  },
  {
    // table "Self_log" will contain logs from this web app itself, it is for tracking online/offline time periods of this app
    name: 'Self_log',
    sql: `
    CREATE TABLE IF NOT EXISTS "Self_log" (
    	"id"	INTEGER,
    	"start"	DATE,
    	"stop"	DATE,
    	PRIMARY KEY("id" AUTOINCREMENT)
    );`
  },
  {
    // table "Token" will contain login data
    name: 'Token',
    sql: `
    CREATE TABLE IF NOT EXISTS "Token" (
    	"token"	TEXT,
    	"logged_in"	INTEGER DEFAULT 1
    );`
  }
]

// creating tables if they do not exist
// doing all tables at once by looping throug array of objects with table data
tableData.forEach((table) => {

  // first check if table already exists
  db.get(`SELECT name FROM sqlite_master WHERE name = '${table.name}';`, function (err, row) {
    if (err) {
      console.log(`Error while checking if table ${table.name} elready exists: ${err}`)
    } else if (!row) { // table does not exist yet, so we can create it
      console.log(`Table ${table.name} does not exist`)
      db.run(table.sql, function (err) {
        if (err) {
          console.log(`Error while creating ${table.name} table: ${err}`)
        } else {
          console.log(`Table ${table.name} was created`)
        }
      })
    } else {
      console.log(`Table ${table.name} already exists`)
    }
  })

})
