const { log } = require('cozy-konnector-libs')

module.exports.login = require('./lib/login').login

const noop = module.exports.noop = function() {
  log('info', 'No Operation')
  return Promise.resolve()
}

