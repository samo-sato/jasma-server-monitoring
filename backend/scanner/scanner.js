// This is main file for scanner functionality
// It mostly invokes main function in regular time intervals
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Import React environment variables from `.env` file
import dotenv from 'dotenv';
dotenv.config();
// Logger
import { logger } from '../functions.js';
import { toInt, validateEnv } from '../../src/utils.js';
import * as functions from './functions.js';
import { getCurrentDateTimeUTC } from '../functions.js';
import handleDB from './handleDB.js';
// Import environment variables
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);
// Time interval (ms) for invoking main functions
const delay = toInt(REACT_APP_REPEAT_DELAY);
// Different style settings for console.log messages for better clarity
let style = {};
style['bold'] = '\x1b[1m%s\x1b[0m';
style['lightBlue'] = '\x1b[94m%s\x1b[0m';
style['lightBlueBold'] = '\x1b[1m\x1b[94m%s\x1b[0m';
style['lightGreen'] = '\x1b[92m%s\x1b[0m';
style['lightRed'] = '\x1b[31m%s\x1b[0m';
// Main function `scan`
// Block of code, that is called in intervals `on the background` of the app
let runCount = 1; // Counting number of scanning runs
let offlineStateCounter = {};
/**
 * Main function `scan`
 * Block of code, that is called in intervals `on the background` of the app
*/
function scan() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const level1 = '|---';
            const level2 = '    |---';
            const timeAtStart = Date.now(); // Timestamp for meassuring length of this try block execution
            // Counting each scanning run
            console.log(style['lightBlueBold'], `Run #${runCount} starts now (${getCurrentDateTimeUTC()})`);
            // Step counter for console logs
            let stepCount = 1;
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Checking connection and loading data from DB`);
            //########################################################################//
            console.log(style['lightBlue'], `${level2}Scanning delay is set to ${delay / 1000} s`);
            // Check if internet connection is working and if yes, only then continue to server monitor
            const internetConnectionOk = yield functions.checkInternetConnection();
            console.log(style['lightBlue'], `${level2}${internetConnectionOk}`);
            // Get Watchdog data of all enabled Watchdogs
            const watchdogs = yield handleDB.getEnabledWatchdogs();
            console.log(style['lightBlue'], `${level2}${watchdogs.length} Watchdog(s) loaded`);
            // Get latest batch of logs
            const logsBefore = yield handleDB.getLastBatch();
            console.log(style['lightBlue'], `${level2}${logsBefore.length} log(s) from previous run loaded`);
            // Get latest self log
            const lastSelfLog = yield handleDB.getLastSelfLog();
            console.log(style['lightBlue'], `${level2}Last self-log loaded`);
            // Determine, if app's backend is after outage or not
            let isAfterOutage = true;
            if (lastSelfLog && // Missing self logs are indicating that app's backend is after outage
                (delay * 1.5) > (Date.now() - lastSelfLog.stop) // Significant gap between last self log timestamp and current timestamp is indicating that app's backend is after outage
            ) {
                isAfterOutage = false; // App's backend is (probably) NOT after outage
                console.log(style['lightBlue'], `${level2}This script is not running after outage`);
            }
            if (isAfterOutage) {
                console.log(style['lightBlue'], `${level2}This script is running after outage or first time`);
            }
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Checking Watchdogs in active mode`);
            //########################################################################//
            // Get array of unique endpoint strings (without duplicates) of Watchdogs in active mode
            const activeUniqueEndpoints = functions.getActiveUniqueEndpoints(watchdogs);
            console.log(style['lightBlue'], `${level2}Loaded ${activeUniqueEndpoints.length} unique url endpoints from Watchdog(s) in active mode`);
            // Check status of endpoints
            const activeWatchdogsResults = yield functions.checkEndpoints(activeUniqueEndpoints);
            const countFulfilled = activeWatchdogsResults.filter(value => value.status === 'fulfilled').length;
            const countRejected = activeWatchdogsResults.filter(value => value.status === 'rejected').length;
            console.log(style['lightBlue'], `${level2}${countFulfilled} endpoint(s) ok`);
            console.log(style['lightBlue'], `${level2}${countRejected} endpoint(s) not ok`);
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Checking Watchdogs in passive mode`);
            //########################################################################//
            // Get array of Watchdog IDs (WIDs) that operate in passive mode
            const passiveWIDs = functions.getPassiveWIDs(watchdogs);
            console.log(style['lightBlue'], `${level2}Loaded ${passiveWIDs.length} passive mode Watchdog(s)`);
            // Get all IDs of passive Watchdogs, that received visit on special API endpoint
            const alivePassiveWIDs = functions.checkPassiveLogs(passiveWIDs);
            console.log(style['lightBlue'], `${level2}${alivePassiveWIDs.length} out of ${passiveWIDs.length} passive mode Watchdog(s) recently visited from monitored server(s)`);
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Generating logs`);
            //########################################################################//
            // Calculate batch number from last scanning results (if exists)
            // If no logs present, first batch number will be `1`
            // Batch number is unique ID for collection of watchdog logs generated in one scanning interval
            const batchNumber = logsBefore[0] ? logsBefore[0].batch + 1 : 1;
            console.log(style['lightBlue'], `${level2}New batch number is ${batchNumber}`);
            // Generate array of logs that will be saved to DB in this scanning interval
            const logs = yield functions.generateLogs(watchdogs, batchNumber, activeWatchdogsResults, alivePassiveWIDs);
            console.log(style['lightBlue'], `${level2}Generated ${logs.length} log(s) for this batch (run)`);
            console.log(style['lightBlue'], `${level2}${logs.filter(value => value.status === 1).length} log(s) have ok status`);
            console.log(style['lightBlue'], `${level2}${logs.filter(value => value.status === 0).length} log(s) have not ok status`);
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Saving logs to DB`);
            //########################################################################//
            // Write acutal logs into database
            const writeLogsResult = yield handleDB.writeLogs(logs);
            console.log(style['lightBlue'], `${level2}${writeLogsResult}`);
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Handling email notifications`);
            let watchdogsToNotify = []; // This will hold Watchdog IDs with associated status change (0 or 1), later used to send notification emails in bulk
            watchdogs.forEach((watchdog, index) => {
                // Only do this for enabled Watchdog with: valid and activated email address, enabled notifications
                if (watchdog.email && watchdog.email_active === 1 && watchdog.email_notif === 1) {
                    // Find log associated to current Watchdog
                    const wLog = logs.find(log => log.id_watchdog === watchdog.id);
                    // If current Watchdog's log has status `0`
                    if (wLog && wLog.status === 0) {
                        // Assign proper value to specific counter
                        if (offlineStateCounter[watchdog.id]) {
                            // Increment counter if counter value not true (`true` means the counter has already reached threshold and thus notification was sent)
                            offlineStateCounter[watchdog.id] = offlineStateCounter[watchdog.id] === true ? offlineStateCounter[watchdog.id] : offlineStateCounter[watchdog.id] + 1;
                        }
                        else {
                            // Assign counter initial value if counter not set
                            offlineStateCounter[watchdog.id] = 1;
                        }
                        // Trigger notification, if given counter, reached pre-defined threshold
                        const threshold = 3;
                        if (offlineStateCounter[watchdog.id] === threshold) {
                            watchdogsToNotify.push({
                                id: watchdog.id,
                                statusChangedTo: wLog.status,
                                email: watchdog.email,
                                name: watchdog.name,
                                note: wLog.note,
                            });
                            offlineStateCounter[watchdog.id] = true;
                        }
                    }
                    // Delete counter, in case log status went back to `1` before offline state counter reached threshold
                    if (wLog && wLog.status === 1 && typeof offlineStateCounter[watchdog.id] === 'number') {
                        delete offlineStateCounter[watchdog.id];
                    }
                    // Trigger notification and delete counter, in case log status went back to `1`
                    if (wLog && wLog.status === 1 && offlineStateCounter[watchdog.id] === true) {
                        watchdogsToNotify.push({
                            id: watchdog.id,
                            statusChangedTo: wLog.status,
                            email: watchdog.email,
                            name: watchdog.name,
                            note: wLog.note,
                        });
                        delete offlineStateCounter[watchdog.id];
                    }
                }
            });
            // Delete counters associated with non-existent Watchdogs (in case User deleted Watchdog in meantime)
            Object.keys(offlineStateCounter).forEach((wid) => {
                const match = watchdogs.find(watchdog => watchdog.id === wid);
                if (match === undefined) {
                    delete offlineStateCounter[wid];
                }
            });
            // Send email notifications
            const mailingResults = functions.notify(watchdogsToNotify);
            yield mailingResults
                .then(responses => {
                const countFulfilled = responses.reduce((count, response) => { return response.status === 'fulfilled' ? count + 1 : count; }, 0);
                const countRejected = responses.reduce((count, response) => { return response.status === 'rejected' ? count + 1 : count; }, 0);
                if (responses.length > 0) {
                    console.log(style['lightBlue'], `${level2}${countFulfilled} mail(s) sent. ${countRejected} mail(s) failed to sent.`);
                }
                else {
                    console.log(style['lightBlue'], `${level2}No email notifications to be sent`);
                }
            })
                .catch(error => {
                console.log(style['lightBlue'], `${level2}${error}`);
            });
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Creating and saving "self logs"`);
            //########################################################################//
            // Write self log into database
            const selfLogResult = yield handleDB.writeSelfLog(isAfterOutage);
            console.log(style['lightBlue'], `${level2}${selfLogResult}`);
            //########################################################################//
            console.log(style['lightBlue'], `${level1}Step #${stepCount++} - Waiting for next run`);
            //########################################################################//
            const timeAtEnd = Date.now(); // Timestamp for meassuring length of this try block execution
            const executionTime = timeAtEnd - timeAtStart;
            console.log(style['lightBlue'], `${level2}Execution time of run #${runCount} was ${executionTime} ms`);
            runCount++; // Increase the `scanning run` counter by one
        }
        catch (error) {
            const msg = `Run #${runCount} interputed because of an error`;
            logger.error(`${msg} [${error.stack || error.data || error}]`);
            console.log(style['lightRed'], msg);
            console.log(error);
        }
    });
}
export default scan;
