const { log, requestFactory } = require('cozy-konnector-libs')
const { encode, deduce } = require('./digipad')

request = requestFactory({
  //debug: true,
  cheerio: true,
  json: false,
  jar: true
})

const getTable = ($) => {
  const table = new Map()
  $('#generali-connexion-form').find('button.c-field__keyboard__btn').each(function() {
    const image = $(this).attr('style').split(' ').pop()
    // NOTE: See #1135 on github@cheeriojs/cheerio
    // .css() is bugged, and prevent a correct parsing in our situation
    const digit = deduce.get(image)
    const value = $(this).attr('data-value')
    table.set(digit, value)
  })
  return table;
}

const formContent = ($, formId) => {
  const action = $(`#${formId}`).attr('action')
  const inputs = {}
  $(`#${formId} input`).each(function(i, el) {
    inputs[$(this).attr('name')] = $(this).attr('value')
  })
  return [action, inputs];
}

const post = (uri, inputs) => {
  return request({
    uri: uri,
    method: 'POST',
    form: {
      ...inputs
    }
  });
}

const evaluateSuccess = ($, step) => {
  //log('info', $('#block-generali-topbar-topbar-accueil-client').text())
  const error = $('#generali_error_messages')
  if (error.length >= 1 && error.html().trim() != '') {
    log('warn', `Login process [${step}/2] failed`)
    log('debug', error.text())
    this.terminate('LOGIN_FAILED')
  } else {
    log('ok', `Login process [${step}/2]`)
  }
}

const BASE_URL = 'https://www.generali.fr'
const FIRST_STEP_URL = `${BASE_URL}/espace-client/public/connexion`
const SECOND_STEP_URL = `${BASE_URL}/espace-client/private/individuel/redirect-ece-eca`

const login = module.exports.login = function(fields) {
  return request(FIRST_STEP_URL)
  .then($ => {
    const [action, inputs] = formContent($, 'generali-connexion-form')
    const table = getTable($)
    inputs.identifiant = fields.login
    inputs.keyboard = encode(fields.passcode, table)

    return [action, inputs];
  })
  .then(([action, inputs]) => post(`${BASE_URL}${action}`, inputs))
  .then($ => evaluateSuccess($, '1'))
  .then(() => request(SECOND_STEP_URL))
  .then($ => formContent($, 'generali-connexion-ece-eca-form'))
  .then(([action, inputs]) => post(action, inputs))
  .then($ => evaluateSuccess($, '2'))
}
