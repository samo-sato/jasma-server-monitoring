# JASMA server monitoring documentation

## What is it

**JASMA** (acronym for **J**ust **A**nother **S**erver **M**onitoring **A**pp) is web app that monitors and logs the status of remote servers or services using http protocol. There are only two types of status that can be logged:
**1** => server has provided valid response
**0** => server has not provided valid response
This app comes with web interface where the user can log-in, control and observe the monitoring process.

## Main features

- ### Active or passive monitoring using "Watchdog" agents
In active mode, the "Watchdog" agent makes http requests in regular intervals to given server and based on the response, the logs are created.
In passive mode, the "Watchdog" agent "passively" waits for the requests from server on dedicated url and based on the frequency of the requests, the logs are created.

- ### Email notifications
Email notifications can be enabled or disabled for each monitoring "Watchdog" agent individually. Email address with other SMTP settings for receiving notifications should be first set in environment variables (more on that later in this text).

- ### Self logging
Self logging means: app is creating logs based on the app's backend running/not-running status. By viewing "self logs", user can detect any time periods during which app was not monitoring other servers.

- ### Viewing and filtering created logs
User can view the logs created by "Watchdog" agents and filter them by number of properties.

- ### CLI interface
When running **backend/server.js** in terminal, which is the main backend script, user can observe some limited messages related to server monitoring in terminal.

- ### Dark mode
User can switch between different graphical themes (light/dark/auto) using menu in upper right corner of the website.

## Development stack

Back-end: Node.js, Express.js, sqlite3
Front-end: React, JavaScript, HTML, CSS

## Main dependencies

- Installed tools:
  - npm
  - nodejs (tested on v16.16.0)
  - concurrently
- Node modules defined in **package.json** (run **npm install** in project directory to install modules)
- Environment variables as defined in this document

## How to deploy

1. Download project files to machine.

2. Install tools and modules mentioned above.

3. Set environment variables with sensitive data and save them into operating system. These will be later used by Node.js's *process.env* property. Please check documentation of your operating system to learn how to add or modify environment variables. In case of operating system *Linux Mint 20 Mate* the file with environment variables is located in home directory under name *.bashrc* (*~/.bashrc*).
List of variables that need to be set in operating system:
**JASMA_backend_port** => *Number of http port where backend scripts including REST API will run*
**JASMA_mail_host** => *SMTP host address for your email address, for example smtp.gmail.com - this will be used for sending email notifications to you*
**JASMA_mail_port** => *Port number of your SMTP server, for example 465*
**JASMA_mail_login** => *Username to your SMPT*
**JASMA_mail_address** => *Your email address*
**JASMA_mail_pw** => *Password to your SMTP*
**JASMA_jwt_secret** => *Your own secret for JWT (JSON Web Token), used to handle app log-ins and log-outs. Learn more at https://jwt.io/*
**JASMA_user_login** => *Your admin login to access web app. You will not be prompted to enter this value. Only password.*
**JASMA_user_pw** => *Your admin password to web app*

4. Set correct value of **backendPort** property in **/src/constants.js**, it should be the same port number as defined in environment variable with the name **JASMA_backend_port**

5. Create database file and relevant tables by running node script located at **/backend/db/create_tables.js**

6. Seed tables with data by running node script located at  **/backend/db/seed_tables.js**

7. Run or build the React using appropriate commands (guide: https://create-react-app.dev/docs/getting-started/). Main back-end script located at **/backend/server.js** must be running with the front-end stack, otherwise only website front-end will be running without server monitoring functionality.

## Adjust variables
There are 2 main places where app's variables are stored.
1. Variables stored in database table named "Parameter". Some of these variables can be changed using app's web interface.
2. Other variables are declared in files, mainly:
- **/src/constants.js**
- File with environment variables of operating system

## Main directories and files

**/backend/server.js** runs main backend scripts including API server and monitoring process
**/backend/api/api.js** REST API server
**/backend/api/methods.js** contains mostly backend methods used in REST API
**/backend/db/** contains database related files
**/backend/scanner/** contains scripts responsible for server monitoring functionality

## How to use it

1. After app is running, open front-end URL with correct port number in the web browser.
2. Login using password defined in environment variables
3. After successful login, following menu items will appear on the website:
- **Home** => Basic server monitoring stats.
- **Watchdogs** => List and status of all "Watchdog" agents. Each agent is responsible for monitoring particular server. "Watchdogs" can be deleted, added and edited. By default there is one "Watchdog" called "Example" which is monitoring server at "https://www.example.org" endpoint.
- **Logs** => Search/filter all logs from server monitoring process.
- **Self logs** => View all "self logs".
- **Settings** => Adjust certain variables.
- **Logout** => Logout from web-admin interface.

## How the app monitors servers

Main server monitoring script is running repeatedly in given time intervals ("monitoring runs") and checking if there are any changes in the status of monitored services by comparing them with logs from previous monitoring run. Logs are made regardless if changes were detected or not. But if changes were detected, then the email notification is sent to user (if given "Watchdog" has email notifications enabled).
