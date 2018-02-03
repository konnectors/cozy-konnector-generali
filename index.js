const { BaseKonnector } = require('cozy-konnector-libs')
const { login } = require('./lib/login')
const { exportReimbursements } = require('./lib/reimbursements')

module.exports = new BaseKonnector(start)

function start(fields) {
  return login(fields)
  .then(exportReimbursements)
}
