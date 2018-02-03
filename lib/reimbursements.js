const { log, requestFactory, saveBills } = require('cozy-konnector-libs')

request = requestFactory({
  cheerio: true,
  json: false,
  jar: true
})

const BASE_URL = 'https://espaceclient.generali.fr'
const relevesUrl = 'https://espaceclient.generali.fr/portal/private/eca/contrat/sante/mesRemboursements?typeDocument=remboursementsSante'

const stringify = function (date) {
  let year = date.getFullYear()
  let month = date.getMonth() + 1
  let day = date.getDate()
  if (month < 10) {
    month = '0' + month
  }
  if (day < 10) {
    day = '0' + day
  }

  return `${year}${month}${day}`
}

const parseAmount = function(amount) {
  return parseFloat(amount.replace(',', '.'))
}

const getText = function(cell) {
  return cell.text().trim()
}

const parseEntriesFor = function(detailsUrl, beneficiary, date, fileUrl) {
  const common = {
    vendor: 'Generali',
    type: 'health_costs',
    isRefund: true,
    beneficiary: beneficiary
  }
  if (fileUrl !== undefined) {
    common.fileurl = BASE_URL + fileUrl
    common.filename = `${stringify(date)}_generali.pdf`
  }

  return request(BASE_URL + detailsUrl)
  .then($ => {
    const entries = []
    $('table tbody tr').each(function (i, el) {
      const entry = {...common}
      const cells = $(this).children('td')
      entry.originalDate = new Date(...getText($(cells[1])).split('/').reverse())
      entry.subtype = getText($(cells[2]))
      entry.originalAmount = parseAmount(getText($(cells[4])))
      entry.socialSecurityRefund = parseAmount(getText($(cells[5])))
      entry.amount = parseAmount(getText($(cells[7])))
      entries.push(entry)
    })
    return entries
  })
}

const exportReimbursements = module.exports.exportReimbursements = function() {
  return request(relevesUrl)
  .then($ => {
    const rows = $('#remboursementSante table tbody tr')
    const entriesPromises = []
    rows.each(function(i, el) {
      const cells = $(this).find('td')
      const beneficiary = getText($(cells[0])).replace(/\s+/, ' ')
      const detailsUrl = $(cells[1]).find('a').attr('href')
      const fileUrl = $(cells[3]).find('a').attr('href')
      const date = new Date(...getText($(cells[2])).split('/').reverse())
      entriesPromises.push(parseEntriesFor(detailsUrl, beneficiary, date, fileUrl))
    })
    return Promise.all(entriesPromises)
  })
  .then(entriesArray => {
    const entries = [].concat.apply([], entriesArray)
    saveBills(
      entries,
      {folderPath: 'releves'},
      {identifiers: ['generali'], keys: ['date', 'amount', 'vendor']}
    )
  })
}
