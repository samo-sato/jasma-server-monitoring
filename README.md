# JASMA Server Monitoring

## Table of Contents
- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
  - [Server Monitoring and using Watchdog agents](#server-monitoring-and-using-watchdog-agents)
  - [Email notifications](#email-notifications)
  - [User login and accounts](#user-login-and-accounts)
  - [Theme mode settings](#theme-mode-settings)
  - [Logging](#logging)
  - [Rate Limiting](#rate-limiting)
- [Tech used](#tech-used)
- [Deployment](#deployment)
  - [Clone](#clone)
  - [Install](#install)
  - [Set environment variables](#set-environment-variables)
  - [Create database tables](#create-database-tables)
  - [Seed database tables and choose password](#seed-database-tables-and-choose-password)
  - [Deploying under base-path URL (optional)](#deploying-under-base-path-url-optional)
  - [Run application](#run-application)

## Overview
**JASMA** (acronym for **J**ust **A**nother **S**erver **M**onitoring **A**pp) is web app that monitors and logs the status of remote servers or services using http protocol. App is able to send email notifications and allows to create multiple user accounts.

## Live Demo
You can explore the JASMA web app through the live demo at following URL: https://www.turis.dev/jasma
Feel free to create a user account without the need to enter an email or other details.
**Warning:** *The live demo is not intended for actual server monitoring. It is just a learning project and the website owner reserves the right to delete or modify any data on the server.*

## Features

### Server Monitoring and using Watchdog agents
User is able to add, edit and remove Watchdog agents. Watchdog agent is responsible for monitoring specific remote server. Each Watchdog is associated with specific User and it operates in one of the following modes:

1. **Active Mode Monitoring**
Watchdog is making requests to user defined URL endpoint. If given endpoint provides response with status code in 2xx range, Watchdog considers status of such server as *ok*, otherwise as *not ok*.

2. **Passive Mode Monitoring**
Watchdog is listening for any request on specific URL endpoint. If request is received within monitoring interval, the Watchdog considers status of monitored server as *ok*, otherwise as *not ok*.

### Email notifications
Watchdog is able to trigger email notifications. Following conditions must be met to receive email notifications:
 - Backend mailer must have correct settings via [environment variables](#set-environment-variables).
 - User must save a valid email in the web UI settings
 - User must receive email with activation link and act on it
 - User must enable email notifications for desired Watchdogs (via editing or adding Watchdog in web UI)
 - Given email address must not be unsubscribed

Email is handled by [Nodemailer](https://nodemailer.com/) module.

### User login and accounts
Master User logs into web UI using password defined during [seeding the tables](#seed-database-tables-and-choose-password).
Multiple non-master user accounts (demo accounts) could be created from main web login page. After account is generated, new user password is shown only once. With this password, non-master user can perform future logins into the web UI. Only limitation of non-master user is maximum amount of Watchdog agents as defined in [environment variables](#set-environment-variables).

### Theme mode settings
In web UI's upper corner menu, user can toggle between *light/dark/auto* theme modes. In case auto theme mode is toggled, switching between light or dark theme styles is performed automatically based on current hour of day on the client side. These threshold hours can be modified in [environment variables](#set-environment-variables).

### Logging
Logging performed in *"runs"* periodically in specific time interval as defined in [environment variables](#set-environment-variables). During each *"run"*, different types of logs are being generated and stored or displayed and if enabled, email notifications might be sent. There are four types of logs:

1. **Main logs**
Each log is associated with specific Watchdog. Logs can be viewed in web UI *Logs* page. Different filters can be applied on search function to display only specific types of logs. These logs are stored in designated database table. Main logs can have one of the following status:

    - **0** => *not ok*, server has not provided valid response
    - **1** => *ok*, server has provided valid response

2. **Self-logs**
Any previous outages or other breaks in server monitoring app are picked up by self-logs and can be viewed in web UI *Self-logs* page.
These logs are stored in designated database table. Self-logs are global for whole app and not User specific.

3. **System logs**
Information about errors and selected events that occur during backend code execution is stored into `/backend/logs` file as JSON. Logging is done by [Winston](https://www.npmjs.com/package/winston) logger module.

4. **Real time console logging (CLI)**
As `/backend/server.js` runs in the background, structured information from real-time server monitoring can be viewed as console output. This feature is especially useful for debugging and quickly grasping the operation of the application.

### Rate Limiting
Rate limiting function is implemented using [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) middleware. Rate limit thresholds can be modified directly within `/backend/api/endpoints.js` file.

## Tech used
This app is primarily built using the following technologies:
- [Node.js](https://nodejs.org)
- [Express](https://expressjs.com/)
- [React](https://react.dev)
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/javascript)
- [SQLite (for node)](https://github.com/TryGhost/node-sqlite3)
- HTML and CSS

## Deployment
Public deployment has been tested Linux Ubuntu 20 (running on VPS) and local deployment was tested on Linux Mint 20 (running on PC).

1. ### Clone
Download or clone repository files to your machine.

2. ### Install
    1. Make sure *nodejs* is installed
    2. Make sure *npm* is installed
    3. Install dependency packages using `npm install` command within project directory

3. ### Set environment variables
There are two required sets of environment variables:

  - **Hidden environment variables** with `JASMA_` prefix
**Warning:** *"Hidden" variables contain sensitive data.*
List of required *"hidden"* environment variables, with description and examples can be found in `/backend/.env.example` file. Cut and paste these variables to OS specific file designated for environment variables. For example in Linux Mint 20 Mate, these variables can be stored in the `~/.bashrc` or `/etc/environment` files.

  - **Exposed environment variables** with `REACT_APP_` prefix
**Warning:** *"Exposed" variables can be read by anyone with access to web UI. Do not store sensitive information in these variables. Also, some of these variables are being accessed not only from frontend side, but also are utilized by the backend using [`dotenv`](https://www.npmjs.com/package/dotenv) module.*
Empty file for *"exposed"* environment variables is located at `/.env`. Use `/.env.example` file as a reference to help you populate your own `/.env` file with required *"exposed"* variables.

**Note:** *After both "hidden" and "exposed" variables are set, use `source` command to apply the changes. For example `source ~/.bashrc` and `source /.env`. Make sure that node's [`process.env`](https://nodejs.org/api/process.html#processenv) property has access to these variables.*

4. ### Create database tables
Run file `/backend/db/create_tables.js`. This will create a database file in the same directory filled with tables necessary for the app.

5. ### Seed database tables and choose password
Run file `/backend/db/seed_tables.js`. This will ask you to write the password to console. Write password and hit enter. You will use this password later to log in to the web UI as the master user. After password is accepted, the tables will be filled with first data.

6. ### Deploying under base-path URL (optional)
In case of deployment under specific path, for example https://www.example.org/jasma, the following steps should be taken:
 - Add *homepage* property into `package.json` file with value of desired base path (eg. `"homepage": "jasma",`)
 - Assign desired base path to exposed environment variable *REACT_APP_BASE_PATH* in `.env` file (eg. `REACT_APP_BASE_PATH=jasma`)
 - Adjust settings of your web server to accommodate new base path if necessary

7. ### Run application
    1. Run the backend and API server by executing `/backend/server.js` file in the background.
    2. Serve the frontend web UI by either running the development server using `npm start` which should open web UI automatically in the browser or make React build `npm run build` and serve the `/build` folder with static web files using a tool like *serve*, *http-server* or similar.
