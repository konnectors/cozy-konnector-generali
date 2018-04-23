const { log, signin } = require('cozy-konnector-libs')
const { encode, deduce } = require('./digipad')

const baseUrl = 'https://www.generali.fr'

module.exports.login = function(fields) {
  return signin({
    url: `${baseUrl}/espace-client/public/connexion`,
    formSelector: '#generali-connexion-form',
    formData: $ => ({
      identifiant: fields.login,
      keyboard: encode(fields.password, getConversionTable($))
    }),
    parse: 'cheerio',
    validate: validateStep(1)
  }).then(() =>
    signin({
      url: `${baseUrl}/espace-client/private/individuel/redirect-ece-eca`,
      formSelector: '#generali-connexion-ece-eca-form',
      parse: 'cheerio',
      validate: validateStep(2)
    })
  )
}

const validateStep = step =>
  function(statusCode, $) {
    const error = $('#generali_error_messages')
    if (error.length >= 1 && error.html().trim() !== '') {
      log('error', `Login process [${step}/2] failed`)
      log('info', error.text())
      return false
    } else {
      log('info', `Login process [${step}/2]`)
      return true
    }
  }

function getConversionTable($) {
  const table = new Map()
  $('#generali-connexion-form')
    .find('button.c-field__keyboard__btn')
    .each(function() {
      const image = $(this)
        .attr('style')
        .split(' ')
        .pop()
      // NOTE: See #1135 on github@cheeriojs/cheerio
      // .css() is bugged, and prevent a correct parsing in our situation
      const digit = deduce.get(image)
      const value = $(this).attr('data-value')
      table.set(digit, value)
    })
  return table
}
