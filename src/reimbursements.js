const { errors, log, requestFactory, saveBills } = require('cozy-konnector-libs')
const { formatDate, formatName, getText, parseAmount, parseDate } = require('./utils')

const request = requestFactory({
  encoding: 'latin1',
  cheerio: true,
  json: false,
  jar: true
})

const baseUrl = 'https://espaceclient.generali.fr'

module.exports.exportReimbursements = function (folderPath) {
  const relevesUrl = `${baseUrl}/portal/private/eca/contrat/sante/mesRemboursements?typeDocument=remboursementsSante`

  return request(relevesUrl)
  .then($ => {
    const parseEntries = []

    // If website is under maintenance
    const errorService = $('#remboursementSante .cadreErrorService')
    if (errorService.length !== 0) {
      log('error', errorService.text().trim())
      throw new Error(errors.VENDOR_DOWN)
    }

    $('#remboursementSante table tbody tr').each(function () {
      const summary = parseSummary($, $(this).children('td'))
      parseEntries.push(parseEntriesFor(summary))
    })
    return Promise.all(parseEntries)
    .then(entries => {
      // Flatten the result array
      return [].concat.apply([], entries)
    })
  })
  .then(entries => {
    saveBills(
      entries,
      {folderPath: folderPath},
      {identifiers: ['generali'], keys: ['date', 'amount', 'vendor']}
    )
  })
}

function parseSummary ($, cells) {
  return {
    beneficiary: formatName(getText($(cells[0]))),
    detailsUrl: $(cells[1]).find('a').attr('href'),
    fileUrl: $(cells[3]).find('a').attr('href'),
    date: parseDate(getText($(cells[2])))
  }
}

function parseEntriesFor ({detailsUrl, beneficiary, date, fileUrl}) {
  const common = {
    vendor: 'Generali',
    type: 'health_costs',
    isRefund: true,
    beneficiary: beneficiary,
    isThirdPartyPayer: true
  }
  if (fileUrl !== undefined) {
    common.fileurl = `${baseUrl}${fileUrl}`
    common.filename = `${formatDate(date)}_generali.pdf`
    common.isThirdPartyPayer = false
    // Based on the asumption that Generali provides a report only if the person
    // has paid the professional himself.
  }

  return request(`${baseUrl}${detailsUrl}`)
  .then($ => {
    const entries = []
    $('table tbody tr').each(function () {
      const row = Array.from($(this).children('td')).map(cell => getText($(cell)))
      entries.push(parseEntry(common, row))
    })
    return entries
  })
}

function parseEntry (common, row) {
  return {
    ...common,
    originalDate: parseDate(row[1]),
    subtype: row[2],
    originalAmount: parseAmount(row[4]),
    socialSecurityRefund: parseAmount(row[5]),
    amount: parseAmount(row[7])
  }
}
