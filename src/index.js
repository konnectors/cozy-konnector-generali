const rqErrs = require('request-promise/errors')
const { BaseKonnector, errors, log } = require('cozy-konnector-libs')
const { login } = require('./login')
const { exportReimbursements } = require('./reimbursements')

module.exports = new BaseKonnector(start)

function start(fields) {
  return login(fields)
    .then(() => exportReimbursements(fields.folderPath))
    .catch(err => {
      if (vendorIsDown(err)) {
        log('error', err)
        throw new Error(errors.VENDOR_DOWN)
      } else if (isRequestErr(err)) {
        log('error', err)
        throw new Error(errors.UNKNOWN_ERROR)
      } else {
        throw err
      }
    })
}

function isRequestErr(err) {
  return Object.keys(rqErrs)
    .map(type => {
      return err instanceof rqErrs[type]
    })
    .reduce((acc, cur) => {
      return acc || cur
    }, false)
}

function vendorIsDown(err) {
  return (
    (err instanceof rqErrs.StatusCodeError &&
      parseInt(err.statusCode / 100) === 5) ||
    (err instanceof rqErrs.RequestError &&
      (err.error.code === 'ENOTFOUND' || err.error.code === 'ECONNRESET'))
  )
}
