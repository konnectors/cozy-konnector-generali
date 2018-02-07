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
    const parseEntries = []
    const rows = $('#remboursementSante table tbody tr').each(function () {
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
      {folderPath: 'releves'},
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
    beneficiary: beneficiary
  }
  if (fileUrl !== undefined) {
    common.fileurl = `${baseUrl}${fileUrl}`
    common.filename = `${stringifyDate(date)}_generali.pdf`
  }

  return request(`${baseUrl}${detailsUrl}`)
  .then($ => {
    const entries = []
    $('table tbody tr').each(function (i, el) {
      const row = Array.from($(this).children('td')).map(cell => getText($(cell)))
      entries.push(parseEntry(common, row))
    })
    return entries
  })
}

function arrayFrom$row ($, $row) {
  return Array.from($row).map(cell => getText($(cell)))
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

function parseDate (text) {
  return new Date(...text.split('/').reverse())
}

function parseAmount (amount) {
  return parseFloat(amount.replace(',', '.'))
}

function getText ($cell) {
  return $cell.text().trim()
}

function formatName (lastFirstName) {
  let fullName = lastFirstName
  .replace(/\s+/, ' ')
  .toLowerCase()
  .replace(/\b\w/g, l => l.toUpperCase())
  .split(' ')

  let firstName = fullName.pop()
  fullName.unshift(firstName)
  return fullName.join(' ')
}

function stringifyDate (date) {
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
