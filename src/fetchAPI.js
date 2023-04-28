import { constants } from './constants'

// API server endpoint root
const backendRoot = window.location.protocol + '//' + window.location.hostname + ':' + constants.backendPort

// object with methods for interacting with API server
// each method returns promise with API response
const fetchAPI = {

  // part of "options" (for "fetch" method) argument that will be used many times
  options: {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  },

  // checking if user has valid auth token (is logged in or not)
  authorized: function () {
    const resource = backendRoot + '/authorized'
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject(false)
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              return new Promise((resolve, reject) => {
                reject(error)
              })
            })
  },

  // login
  login: function (password) {
    const resource = `${backendRoot}/${constants.urlNonAuth}`
    const body = JSON.stringify({
      userName: 'admin',
      password: password
    })
    const opt = {
      ...this.options,
      method: 'POST',
      body: body
    }
    return fetch(resource, opt)
            .then(response => {
              return response.json() // returning promise that resolves to JSON object
                .then(jsonResponse => {
                  return new Promise((resolve, reject) => {
                    resolve(
                      {
                        authorized: response.ok, // login status (if login was successful or not)
                        message: jsonResponse.message // status message for user
                      }
                    )
                  })
                })
            })
            .catch(error => {
              return {
                authorized: false,
                message: 'Server fetch error'
              }
            })
  },

  // logout
  logout: function () {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/logout`
    const opt = {
      ...this.options,
      method: 'POST'
    }
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject(response.status)
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              return new Promise((resolve, reject) => {
                reject(error)
              })
            })
  },

  // fetch "Watchdog" items from API server
  getWatchdogs: function () {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/watchdogs`
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject()
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              console.log(error)
            })
  },

  // fetch "Watchdog" single item from API server
  getWatchdog: function (id) {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/watchdogs/${id}`
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject()
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              console.log(error)
            })
  },

  // update "Watchdog" item using fetch
  updateWatchdog: function (id, watchdogData) {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/watchdogs/${id}`
    const opt = {
      ...this.options,
      method: 'PUT',
      body: JSON.stringify(watchdogData)
    }
    return fetch(resource, opt)
            .then(response => {
              if (response.ok) {
                return response.json() // success
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
  },

  // delete "Watchdog" item using fetch
  deleteWatchdog: function (id) {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/watchdogs/${id}`
    const opt = {
      ...this.options,
      method: 'DELETE'
    }

    return fetch(resource, opt)
            .then(response => {
              if (response.status === 204) {
                return new Promise((resolve, reject) => {
                  resolve('Watchdog deleted successfully') // success
                })
              } else {
                return new Promise((resolve, reject) => {
                  reject('Server error')
                })
              }
            })
            .catch(error => {
              return new Promise((resolve, reject) => {
                reject('Server error')
              })
            })
  },

  // add "Watchdog" item using fetch
  addWatchdog: function (watchdogData) {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/watchdogs`
    const opt = {
      ...this.options,
      method: 'POST',
      body: JSON.stringify(watchdogData)
    }
    return fetch(resource, opt)
            .then(response => {
              if (response.ok) {
                return response.json() // success
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
  },

  // fetch basic stats (for home page) from API server
  getStats: function () {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/stats`
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject()
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              return new Promise((resolve, reject) => {
                reject('Server error')
              })
            })
  },

  // get app's parameters
  getParams: function () {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/parameters`
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject()
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              console.log(error)
            })
  },

  // update app's parameters
  updateParams: function (params) {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/parameters`
    const opt = {
      ...this.options,
      method: 'PUT',
      body: JSON.stringify(params)
    }
    return fetch(resource, opt)
            .then(response => {
              if (response.ok) {
                return response.json() // success
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
  },

  // get app's self logs
  getSelfLogs: function () {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/selflogs`
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (!response.ok) {
                return new Promise((resolve, reject) => {
                  reject()
                })
              }
              return response.json().then(jsonResponse => {
                return jsonResponse
              })
            })
            .catch(error => {
              console.log(error)
            })
  },

  // get app's logs
  getLogs: function (queryString) {
    const resource = `${backendRoot}/${constants.urlAuthOnly}/logs${queryString}`
    const opt = this.options
    return fetch(resource, opt)
            .then(response => {
              if (response.ok) {
                return response.json() // success
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

}

export default fetchAPI
