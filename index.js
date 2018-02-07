const errors = require('request-promise/errors')
const { log, BaseKonnector } = require('cozy-konnector-libs')
const { login } = require('./lib/login')
const { exportReimbursements } = require('./lib/reimbursements')

module.exports = new BaseKonnector(start)

function start (fields) {
  return login(fields)
  .then(exportReimbursements)
  .catch(err => {
    if (vendorIsDown(err)) {
      log('error', err)
      throw new Error('VENDOR_DOWN')
    } else if (isRequestErr(err)) {
      log('error', err)
      throw new Error('UNKNOWN_ERROR')
    } else {
      throw err
    }
  })
}

function isRequestErr (err) {
  return Object.keys(errors).map(type => { return err instanceof errors[type] }).reduce((acc, cur) => { return acc || cur }, false)
}

function vendorIsDown (err) {
  return (
    (err instanceof errors.StatusCodeError && parseInt(err.statusCode / 100) == 5) ||
    (err instanceof errors.RequestError && (err.error.code == 'ENOTFOUND' || err.error.code == 'ECONNRESET'))
  )
}
