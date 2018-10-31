// Force sentry DSN into environment variables
// In the future, will be set by the stack
process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://104958ead19c447a9596339f426022d3:788c738e066148c38f3639d38e157c17@sentry.cozycloud.cc/29'

const rqErrs = require('request-promise/errors')
const { BaseKonnector, errors, log } = require('cozy-konnector-libs')
const { login } = require('./login')
const { exportReimbursements } = require('./reimbursements')

module.exports = new BaseKonnector(start)

async function start(fields) {
  try {
    const rembLink = await login(fields)
    if (rembLink != undefined) {
      return await exportReimbursements(fields.folderPath, rembLink)
    } else {
      log(
        'warn',
        'No medical inssurance found, this version cannot do more, exiting'
      )
      return
    }
  } catch (err) {
    if (vendorIsDown(err)) {
      log('error', err)
      throw new Error(errors.VENDOR_DOWN)
    } else if (isRequestErr(err)) {
      log('error', err)
      throw new Error(errors.UNKNOWN_ERROR)
    } else {
      throw err
    }
  }
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
