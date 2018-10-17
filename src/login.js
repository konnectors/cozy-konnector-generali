const { log, requestFactory, errors } = require('cozy-konnector-libs')
const { encode, deduce } = require('./digipad')
const request = requestFactory({
  cheerio: true,
  //  debug: true,
  jar: true
})

const baseUrl = 'https://www.generali.fr'

module.exports.login = async function(fields) {
  let $ = await request({
    url: `${baseUrl}/espace-client/public/connexion`
  })
  log('debug', 'Form fetched, launching login')
  $ = await request({
    url: `${baseUrl}/espace-client/public/connexion`,
    method: 'POST',
    formData: {
      identifiant: fields.login,
      keyboard: encode(fields.password, getConversionTable($)),
      op: 'Connexion',
      form_id: 'generali_connexion_form',
      form_build_id: $(
        '#generali-connexion-form input[name=form_build_id]'
      ).val()
    }
  })
  log('debug', 'Testing for LOGIN_FAILED')
  if (
    $.html().includes('Vos codes d&apos;acc&#xE8;s ne sont pas reconnus')) {
    log('error', `Generali indicates that credentials is bad`)
    throw new Error(errors.LOGIN_FAILED)
  }
  else {
    log('info', 'Login succeed')
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
