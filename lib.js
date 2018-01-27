const { log } = require('cozy-konnector-libs')

const noop = module.exports.noop = function() {
  log('info', 'No Operation')
  return Promise.resolve()
}

