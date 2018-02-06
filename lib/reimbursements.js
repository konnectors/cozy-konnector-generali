const { log, requestFactory, saveBills } = require('cozy-konnector-libs')

request = requestFactory({
  cheerio: true,
  json: false,
  jar: true
})

const baseUrl = 'https://espaceclient.generali.fr'

module.exports.exportReimbursements = function() {
  const relevesUrl = `${baseUrl}/portal/private/eca/contrat/sante/mesRemboursements?typeDocument=remboursementsSante`

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

function parseEntriesFor (detailsUrl, beneficiary, date, fileUrl) {
  const common = {
    vendor: 'Generali',
    type: 'health_costs',
    isRefund: true,
    beneficiary: beneficiary
  }
  if (fileUrl !== undefined) {
    common.fileurl = baseUrl + fileUrl
    common.filename = `${stringify(date)}_generali.pdf`
  }

  return request(baseUrl + detailsUrl)
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

function stringify (date) {
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

function parseAmount (amount) {
  return parseFloat(amount.replace(',', '.'))
}

function getText (cell) {
  return cell.text().trim()
}
