var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Import shared environment variables from ".env" file
import dotenv from 'dotenv';
dotenv.config();
// Import required functions
import { logger, handleError, generateUnsubscribeKeyUrl, generateActivationKeyUrl, sendMail, activationEndpoint, unsubscribeEndpoint } from '../functions.js';
// Import Express.js
import express from 'express';
const app = express();
// Import other functions and variables
import { toInt, snoozePath, apiPathName, restrictedPath, validateEnv } from '../../src/utils.js';
import { getCurrentDateTimeUTC } from '../functions.js';
import { validate, loginUser } from './functions.js';
import * as handleDB from './handleDB.js';
// Import Express middleware `Request Rate Limit`
import { rateLimit } from 'express-rate-limit';
// Import Express middleware `Cors`
import cors from 'cors';
app.use(cors({
    origin: true,
    credentials: true
}));
// Express middleware (cookie parser)
import cookieParser from 'cookie-parser';
app.use(cookieParser());
// JSON Web Token
import pkg from 'jsonwebtoken';
const { verify: jwtVerify } = pkg;
// Import environment variables
const JASMA_TRUST_PROXY = validateEnv(process.env.JASMA_TRUST_PROXY, false);
const REACT_APP_BASE_PATH = validateEnv(process.env.REACT_APP_BASE_PATH, false);
const REACT_APP_SECURE = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_REPEAT_DELAY = validateEnv(process.env.REACT_APP_REPEAT_DELAY, true);
const JASMA_JWT_SECRET = validateEnv(process.env.JASMA_JWT_SECRET, true);
// Environment variable `trust proxy` flag to be set in Express
let trustProxy = false;
if (JASMA_TRUST_PROXY.toLowerCase() === 'true') {
    trustProxy = true;
}
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
// Use middleware to trust the proxy's headers
app.set('trust proxy', trustProxy);
// Message that will be used if rate limit is reached
const rateLimitMsg = 'Too many requests';
// Rate limiter applied on all endpoints
const rootLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    // Max: 10, // Limit for testing
    handler: (req, res) => {
        logger.info(`Rate limit reached. Last detected IP address of the client [${req.ip}]`);
        res.status(429).send({ message: rateLimitMsg });
    }
});
// Apply basic rate limiter on all endpoints
app.use('/', rootLimiter);
// If using base path, all traffic should go via base path
// Eg. https://www.example.com/basepath
const baseRouter = express.Router();
// Constructing beginning of all endpoint paths
const apiPath = REACT_APP_BASE_PATH ? (apiPathName ? `/${apiPathName}` : '') : apiPathName;
let rootPath = `/${REACT_APP_BASE_PATH}${apiPath}`;
// Using secure connection true or false
const secure = REACT_APP_SECURE.toLowerCase() === 'true' ? true : false;
app.use(rootPath, baseRouter);
// Using `auth` router for endpoints with mandatory authentication
const authRouter = express.Router();
baseRouter.use(`/${restrictedPath}`, authenticate, authRouter);
// Rate limiter applied on specific endpoints requiring more strict request rate limiting
const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 6,
    // Max: 10, // limit for testing
    handler: (req, res, next, options) => {
        logger.info(`Strict rate limit reached. Last detected IP address of the client [${req.ip}]`);
        res.status(429).send({ message: rateLimitMsg });
    }
});
// Applie the strict rate limitter on specific endpoints
baseRouter.use(['/login', '/register'], strictLimiter);
authRouter.put('/settings', strictLimiter);
// This API endpoint handles requests from services in "passive" mode
// Each hit of following endpoint with correct parameter will create temporary log with timestamp and id (stored in wide-scoped array variable "passiveLogs")
let passiveLogs = []; // In this variable will be stored temporary logs, it will be exported and use in another script for further processing
baseRouter.get(`/${snoozePath}`, (req, res) => {
    const watchdogID = req.query.wid;
    // Extracting Watchdog ID from the request (it identifies related Watchdog / service)
    if (typeof watchdogID !== 'string') {
        throw new Error(`Value "${watchdogID}" of "Watchdog ID" is not a string`);
    }
    // Update the timestamp of given id in array with temporary logs if needed
    let logUpdated = false;
    passiveLogs.forEach((value, index) => {
        if (value.watchdogID === watchdogID) {
            passiveLogs[index].timestamp = Date.now(); // Update the timestamp
            logUpdated = true;
        }
    });
    // If the log with watchdog ID from request does not exist yet in our log array, we need to add it there
    if (!logUpdated) {
        passiveLogs.push({
            watchdogID: watchdogID,
            timestamp: Date.now()
        });
    }
    // Remove old logs from wide-scope variable to save memory
    passiveLogs = passiveLogs.filter(log => log.timestamp > Date.now() - toInt(REACT_APP_REPEAT_DELAY) * 2);
    const msg = `Endpoint [${req.url}] was hit from IP [${req.ip}]`;
    logger.info(msg);
    res.status(200).send('ok');
});
// Endpoint for creating new account and automatic login when account created successfully
baseRouter.get('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Check user's answer to antibot question
    const getAnswer = () => {
        const a = req.query.answer;
        if (typeof a === 'string') {
            return a;
        }
        return '';
    };
    const answer = getAnswer();
    if (answer === '3' || answer.toLowerCase() === 'three') {
        try {
            const user = yield handleDB.addUser();
            const msg = `User [${user.data.uuid}] added to DB. IP [${req.ip}].`;
            logger.info(msg);
            const loggedUser = yield loginUser(user.data.uuid);
            const token = loggedUser.data;
            saveTokenToCookie(token, res);
            res.status(201).send({
                message: 'Account created, user logged in',
                password: user.data.password,
                uuid: user.data.uuid,
                time: getCurrentDateTimeUTC()
            });
        }
        catch (error) {
            const msg = 'Create account has failed';
            handleError(error, msg);
            res.status(500).send({ message: msg });
        }
    }
    else {
        const msg = `Invalid answer [${answer}] to antibot question`;
        logger.info(msg);
        res.status(400).send({ message: 'Wrong answer, please try again' });
    }
}));
// Confirm User's email address (after user clicks on confirmation link in email message)
baseRouter.get(`/${activationEndpoint}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const key = req.query.key;
    if (typeof key !== 'string') {
        const msg = 'Invalid activation key';
        logger.error(`${msg} [${key}]`);
        res.status(400).send(msg);
        return;
    }
    try {
        const result = yield handleDB.activateEmail(key);
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = 'Email activation has failed';
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
// Unsubscribe email address (after user clicks on unsubscribe hyperlink in email message)
baseRouter.get(`/${unsubscribeEndpoint}`, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const key = req.query.key;
    if (typeof key !== 'string') {
        const msg = 'Invalid unsubscribe key';
        logger.error(`${msg} [${key}]`);
        res.status(400).send(msg);
        return;
    }
    try {
        const result = yield handleDB.unsubscribeEmail(key);
        const msg = `Email address associated with unsubscribe key [${key}] has been successfully unsubscribed`;
        logger.info(msg);
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = `Email address failed to unsubscribe [unsubscribe key: [${key}]]`;
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
// Endpoint for users without authentication (login page)
baseRouter.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let uuid;
    try {
        // Check if user with given password exists and get user's uuid
        uuid = yield handleDB.getUUIDbyPassword(req.body.password);
        // Fetch User's settings
        const settings = yield handleDB.getSettings(uuid);
        // Login the User and save login token to DB and http cookie
        const loggedUser = yield loginUser(uuid);
        const token = loggedUser.data;
        // Save token to http cookie
        saveTokenToCookie(token, res);
        // User is logged in
        // Log information about successful login
        logger.info(`User [${uuid}] logged in. IP [${req.ip}].`);
        // Send back success response with uuid of User and current server time
        res.status(200).send({
            uuid: uuid,
            message: 'Login successful',
            time: getCurrentDateTimeUTC()
        });
    }
    catch (error) {
        const msg = `User [${uuid}] failed to log in`;
        const code = handleError(error, msg);
        res.status(code).send({ message: msg });
    }
}));
// Endpoint for user logout
authRouter.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Loading token from cookie
        const token = req.cookies.token;
        // Invalidate User token
        const loggedOut = yield handleDB.logoutToken(token);
        // Prepare token cookie to be removed
        const cookieOptions = {
            httpOnly: true,
            sameSite: 'strict',
            secure: secure,
            expires: new Date(0)
        };
        // Remove token cookie and send success response
        res.cookie('token', '', cookieOptions);
        res.status(200).send({ data: 'ok' });
    }
    catch (error) {
        const msg = 'Logout failed';
        handleError(error, msg);
        res.status(500).send({ data: msg });
    }
}));
// Id param validation middleware
authRouter.param('id', (req, res, next, idParam) => {
    if (typeof idParam === 'string' && idParam !== '') {
        req.id = idParam;
        next();
    }
    else {
        const msg = 'ID validation failed';
        logger.error(`${msg}. Param: [${idParam}]`);
        next(msg);
    }
});
authRouter.get('/authenticate', (req, res) => {
    const data = {
        authenticated: true,
        uuid: req.uuid,
        time: getCurrentDateTimeUTC()
    };
    res.status(200).send(data);
});
// Get all items from `Watchdog` table
authRouter.get('/watchdogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield handleDB.getWatchdogs(req.uuid);
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = 'GET failed to get Watchdogs';
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
// Get signle item from `Watchdog` table
authRouter.get('/watchdogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield handleDB.getWatchdog(req.id, req.uuid);
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = `GET failed to get Watchdog [ID: ${req.id}]`;
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
// Updating item inside `Watchdog` table
authRouter.put('/watchdogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body; // Input data about new item
    const errors = validate.watchdog(data); // Input data validation
    if (errors.length === 0) { // If validation ok
        // Update Watchdog
        handleDB.updateWatchdog(req.id, data, req.uuid)
            .then((response) => {
            res.status(response.code).send({ data: response.data });
        })
            .catch((error) => {
            const msg = 'PUT failed to update Watchdog';
            logger.error(`${msg} ID [${req.id}] [${error.data || error}]`);
            res.status(error.code).send({ data: msg });
        });
    }
    else { // If validation not ok, return error messages related to failed validation
        res.status(400).send({ data: errors });
    }
}));
// Adding item into `Watchdog` table
authRouter.post('/watchdogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // User input validation
    const data = req.body;
    const uuid = req.uuid;
    const valErrors = validate.watchdog(data);
    if (valErrors.length === 0) {
        try {
            // Duplicity check
            yield handleDB.checkWatchdogDuplicity(data.name, data.url, uuid);
            // Max enabled Watchdogs check
            // Non-master User is allowed to have max specific amount of enabled Watchdogs (limit defined in envrionment variables)
            if (data.enabled === 1) {
                yield handleDB.checkMaxWatchdogs(uuid);
            }
            ;
            // adding new Watchdog
            const watchdogAdded = yield handleDB.addWatchdog(data, uuid);
            // Send success response
            res.status(watchdogAdded.code).send({ data: watchdogAdded.data });
        }
        catch (error) {
            const msg = 'POST failed to add new Watchdog';
            const code = handleError(error, msg);
            res.status(code).send({ data: msg });
        }
    }
    else {
        res.status(400).send({ data: valErrors });
    }
}));
// Deleting item inside `Watchdog` table
authRouter.delete('/watchdogs/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield handleDB.deleteWatchdog(req.id, req.uuid);
        res.status(result.code).end(); // DELETE response can not contain body
    }
    catch (error) {
        const msg = `DELETE failed to delete Watchdog [ID: ${req.id}]`;
        const code = handleError(error, msg);
        res.status(code).end();
    }
}));
// Get basic stats for homepage
authRouter.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield handleDB.getStats(req.uuid);
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = 'GET failed to get stats';
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
// Get app's settings
authRouter.get('/settings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield handleDB.getSettings(req.uuid);
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = 'GET failed to get settings';
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
// Update app's settings
authRouter.put('/settings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body; // Input data about new item
    let errors = validate.email(data.email);
    if (errors.length === 0) { // If validation ok
        try {
            let activationLinkSent = false;
            const oldEmail = yield handleDB.getEmail(req.uuid);
            if (data.email !== "" && data.email !== oldEmail.data) {
                yield handleDB.checkEmailDuplicity(data.email);
                // Email address is going to change, must generate new associated keys
                const unsubKeyUrl = generateUnsubscribeKeyUrl();
                const actKeyUrl = generateActivationKeyUrl();
                data.unsubscribeKey = unsubKeyUrl.key;
                data.activationKey = actKeyUrl.key;
                // Sending email with activation link
                const subject = 'Activate your email';
                const message = `Please open following activation link in your web browser: ${actKeyUrl.url} `;
                yield sendMail(data.email, subject, message, true);
                activationLinkSent = true;
            }
            const updated = yield handleDB.updateSettings(data, activationLinkSent, req.uuid);
            let msgs = [];
            if (activationLinkSent) {
                const msg = `An activation link has been sent to ${data.email}. Please follow the email instructions to proceed.`;
                msgs.push(msg);
            }
            msgs.push(updated.data);
            res.status(updated.code).send({ data: msgs });
        }
        catch (error) {
            const msg = `PUT failed to update settings`;
            handleError(error, msg);
            res.status(500).send({ data: msg });
        }
    }
    else { // If validation not ok, return error messages related to failed validation
        res.status(400).send({ data: errors });
    }
}));
// Get logs
authRouter.get('/logs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reqQuery = req.query;
    const validateLogFilter = validate.logFilter(reqQuery); // Validate form data
    if (validateLogFilter.length > 0) { // If validation not ok
        return res.status(400).send({ data: validateLogFilter });
    }
    try {
        const result = yield handleDB.getLogs(reqQuery, req.uuid);
        res.status(result.code).send(result);
    }
    catch (error) {
        const msg = `GET failed to get settings`;
        const code = handleError(error, msg);
        res.status(code).send({ data: msg });
    }
}));
// Get app's self logs
authRouter.get('/selflogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield handleDB.getSelfLogs();
        res.status(result.code).send(result.data);
    }
    catch (error) {
        const msg = `GET failed to get self-logs`;
        const code = handleError(error, msg);
        res.status(code).send(msg);
    }
}));
/**
 * Saving auth token string to http cookie
 * @param token String representing token that will be saved to http cookie
 * @param res `res` parameter (Express)
*/
function saveTokenToCookie(token, res) {
    res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'Strict',
        secure: secure
    });
}
/**
 * Authentication middleware
 * @param req `req` parameter (Express)
 * @param res `res` parameter (Express)
 * @param next `next` parameter (Express)
 * @returns Promise
 */
function authenticate(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = req.cookies.token;
        try {
            // Check if token is still valid
            const loggedIn = yield handleDB.isTokenLoggedIn(token);
            jwtVerify(token, JASMA_JWT_SECRET);
            const uuid = yield handleDB.getUUIDbyToken(token);
            res.setHeader('uuid', uuid);
            req.uuid = uuid;
            next();
        }
        catch (error) {
            res.status(401).send({ message: 'Unauthorized' });
        }
    });
}
export { app, passiveLogs };
