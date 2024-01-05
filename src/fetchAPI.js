import { urlBase, restrictedPath } from './globals.js'

// this file handles all client-side API requests/responses

// set base URL of public API server
const baseUrl =  urlBase(process.env.REACT_APP_PUBLIC_PORT_API, true)

// generic unspecified server error message
const serErr = 'Server error'

// function handling returned status code of fetch call
function handleStatusCode(code) {
  if (code === 429) {
    console.log(`Status code ${code} detected`)
    window.alert('Too many requests, please return back later')
    throw new Error('Too many requests')
  }
}

// generic part of fetch() "options" argument
let options = {
  credentials: 'include',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
}

// checking authentication
export function isAuthenticated() {
  const resource = `${baseUrl}/${restrictedPath}/authenticate`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      return response.json()
    })
    .catch(error => {
      console.log(error)
    })
}

// create new account
export function register(answer) {
  const resource = `${baseUrl}/register?answer=${answer}`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      return response.json() // returning promise that resolves to JSON object
        .then(jsonResponse => {
          return new Promise((resolve, reject) => {
            resolve(
              {
                authenticated: response.ok, // login status (if login was successful or not)
                message: jsonResponse.message, // status message for user
                uuid: jsonResponse.uuid, // uuid of new user
                password: jsonResponse.password, // plaintext password of new user
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

// user login
export function login(password) {
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
      return response.json() // returning promise that resolves to JSON object
        .then(jsonResponse => {
          return new Promise((resolve, reject) => {
            resolve(
              {
                authenticated: response.ok, // login status (if login was successful or not)
                uuid: jsonResponse.uuid, // uuid of logged in user
                message: jsonResponse.message, // status message for user
                time: jsonResponse.time
              }
            )
          })
        })
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error)
      })
    })

}

// user logout
export function logout() {
  const resource = `${baseUrl}/${restrictedPath}/logout`
  const opt = {
    ...options,
    method: 'POST'
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
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// fetch "Watchdog" items
export function getWatchdogs() {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// fetch single "Watchdog" item
export function getWatchdog(id) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// update "Watchdog" item
export function updateWatchdog(id, watchdogData) {
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
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// delete "Watchdog" item
export function deleteWatchdog(id) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs/${id}`
  const opt = {
    ...options,
    method: 'DELETE'
  }

  return fetch(resource, opt)
    .then(response => {
      handleStatusCode(response.status)
      return new Promise((resolve, reject) => {
        if (response.status === 204) {
          resolve('Watchdog deleted successfully')
        } else {
          reject(serErr)
        }
      })
    })
    .catch(error => {
      return new Promise((resolve, reject) => {
        reject(error)
      })
    })
}

// add "Watchdog" item
export function addWatchdog(watchdogData) {
  const resource = `${baseUrl}/${restrictedPath}/watchdogs`
  const opt = {
    ...options,
    method: 'POST',
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
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// fetch basic stats (for home page) from API server
export function getStats() {
  const resource = `${baseUrl}/${restrictedPath}/stats`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// get users's settings
export function getSettings() {
  const resource = `${baseUrl}/${restrictedPath}/settings`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// update user's settings
export function updateSettings(settings) {
  const resource = `${baseUrl}/${restrictedPath}/settings`
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
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// get app's self logs
export function getSelfLogs() {
  const resource = `${baseUrl}/${restrictedPath}/selflogs`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data)
            })
            .catch(error => {
              reject(error.data)
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

// get app's logs
export function getLogs(queryString) {
  const resource = `${baseUrl}/${restrictedPath}/logs${queryString}`
  return fetch(resource, options)
    .then(response => {
      handleStatusCode(response.status)
      if (response.ok) {
        return response.json()
      } else {
        return new Promise((resolve, reject) => {
          response.json()
            .then(error => {
              reject(error.data)
            })
            .catch(error => {
              reject()
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
