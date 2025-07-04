// This file handles all client-side API requests / responses

import { urlBase, restrictedPath, validateEnv, WatchdogData, Settings } from './utils.js';

// Validating environment variables
const REACT_APP_SECURE          = validateEnv(process.env.REACT_APP_SECURE, false);
const REACT_APP_DOMAIN          = validateEnv(process.env.REACT_APP_DOMAIN, true);
const REACT_APP_BASE_PATH       = validateEnv(process.env.REACT_APP_BASE_PATH, false);
const REACT_APP_SUBDOMAIN       = validateEnv(process.env.REACT_APP_SUBDOMAIN, false);
const REACT_APP_PUBLIC_PORT_API = validateEnv(process.env.REACT_APP_PUBLIC_PORT_API, false);

let urlBaseEnvs = {
  secure: REACT_APP_SECURE,
  domain: REACT_APP_DOMAIN,
  basePath: REACT_APP_BASE_PATH,
  subdomain: REACT_APP_SUBDOMAIN,
  port: REACT_APP_PUBLIC_PORT_API
}

// Set base URL of public API server
const baseUrl =  urlBase(urlBaseEnvs, true);

// Generic unspecified server error message
const serErr = 'Server error';

// Function handling returned status code of fetch call
function handleStatusCode(code: number) {
  if (code === 429) {
    console.log(`Status code ${code} detected`);
    window.alert('Too many requests, please return back later');
    throw new Error('Too many requests');
  }
}

interface Options {
  credentials: RequestCredentials,
  headers: {
    'Accept': string,
    'Content-Type': string
  }
}

// Generic part of fetch() `options` argument
let options: Options = {
  credentials: 'include',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
}

// Checking authentication
export function isAuthenticated() {
  const resource = `${baseUrl}/${restrictedPath}/authenticate`;
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status);
      return response.json();
    })
    .catch(error => {
      console.log(error);
    })
}

// Create new account
export function register(answer: string): Promise<any> {
  const resource = `${baseUrl}/register?answer=${answer}`;
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      return response.json() // Returning promise that resolves to JSON object
        .then(jsonResponse => {
          return new Promise((resolve, reject) => {
            resolve(
              {
                authenticated: response.ok, // Login status (if login was successful or not)
                message: jsonResponse.message, // Status message for user
                uuid: jsonResponse.uuid, // Uuid of new user
                password: jsonResponse.password, // Ulaintext password of new user
                time: jsonResponse.time
              }
            )
          })
        })
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject({
          authenticated: false,
          message: serErr
        })
      })
    })
}

// User login
export function login(password: string): Promise<any> {
  const resource = `${baseUrl}/login`
  const body = JSON.stringify({
    password: password
  })
  const opt = {
    ...options,
    method: 'POST',
    body: body
  }
  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status)
      return response.json() // Returning promise that resolves to JSON object
        .then(jsonResponse => {
          return new Promise((resolve, reject) => {
            resolve(
              {
                authenticated: response.ok, // Login status (if login was successful or not)
                uuid: jsonResponse.uuid, // Uuid of logged in user
                message: jsonResponse.message, // Status message for user
                time: jsonResponse.time
              }
            )
          })
        })
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })

}

// user logout
export function logout() {
  const resource = `${baseUrl}/${restrictedPath}/logout`;
  const opt = {
    ...options,
    method: 'POST'
  }
  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json();
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {;
              reject(error.data)
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// fetch `Watchdog` items
export function getWatchdogs() {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json();
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// Fetch single `Watchdog` item
export function getWatchdog(id: string) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`;
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json();
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// Update `Watchdog` item
export function updateWatchdog(id: string, watchdogData: WatchdogData) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`
  const opt = {
    ...options,
    method: 'PUT',
    body: JSON.stringify(watchdogData)
  }
  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// Delete `Watchdog` item
export function deleteWatchdog(id: string) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`;
  const opt = {
    ...options,
    method: 'DELETE'
  }

  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status);
      return new Promise((resolve, reject) => {
        if (response.status === 204) {
          resolve('Watchdog deleted successfully')
        } else {
          reject(serErr);
        }
      })
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// Add `Watchdog` item
export function addWatchdog(watchdogData: WatchdogData) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs`;
  const opt = {
    ...options,
    method: 'POST',
    body: JSON.stringify(watchdogData)
  }
  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status);
      if (response.ok) {
        return response.json();
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// Fetch basic stats (for home page) from API server
export function getStats() {
  const resource = `${baseUrl}/${restrictedPath}/stats`;
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status);
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error)
      })
    })
}

// Get users's settings
export function getSettings() {
  const resource = `${baseUrl}/${restrictedPath}/settings`;
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status);
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}

// Update user's settings
export function updateSettings(settings: Settings) {
  const resource = `${baseUrl}/${restrictedPath}/settings`;
  const opt = {
    ...options,
    method: 'PUT',
    body: JSON.stringify(settings)
  }
  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject(error.data);
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error)
      })
    })
}

// Get app's logs
export function getLogs(queryString: string) {
  const resource = `${baseUrl}/${restrictedPath}/logs${queryString}`;
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data);
            })
            .catch(error => {
              reject();
            })
        })
      }
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error);
      })
    })
}
