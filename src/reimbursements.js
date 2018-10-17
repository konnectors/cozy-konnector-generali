const {
  errors,
  log,
  requestFactory,
  saveBills
} = require('cozy-konnector-libs')
const {
  formatDate,
  formatName,
  getText,
  parseAmount,
  parseDate
} = require('./utils')
const cheerio = require('cheerio')
const request = requestFactory({
  cheerio: true,
  //  debug: true,
  json: false,
  jar: true
})

const baseUrl = 'https://www.generali.fr'

/* API SPEC on Oct 2018
* Requests
*   - Url /espace-client/private/individuel/mes-contrats/sante/mes-remboursements/more? +args
*   - arg start starting at element 0, give always 10 elements
*   - arg contrat is mandatory
*   - args date_form and date_to are optionnal on a 2 year window
* Results
*  - Array of Json object
*  - Can't force time windows more than 2 years to have more results
*  - Object with command: insert and method: before contains data with html
*  - End detection with the obj command: remove and selector: contains .plus-de-reglements
*/

module.exports.exportReimbursements = async function(folderPath, rembLink) {
  const apiUrl =
    baseUrl +
    '/espace-client/private/individuel/mes-contrats/sante/mes-remboursements/more?'
  const contrat = rembLink.match(/contrat=(.*)/)[1]
  let apiIndex = 0
  let finalHtml = ''

  log('info', 'Requesting 10 first refunds')
  let $ = await request(apiUrl + `contrat=${contrat}` + `&start=${apiIndex}`)

  // If website is under maintenance, unkown if still present on new site
  const errorService = $('#remboursementSante .cadreErrorService')
  if (errorService.length !== 0) {
    log('error', errorService.text().trim())
    throw new Error(errors.VENDOR_DOWN)
  }

  finalHtml += extractHtml($)

  // Request 10 more results until the end
  while (hasMoreResults($)) {
    apiIndex += 10
    log('info', `Requesting ${apiIndex}-${apiIndex + 10}`)
    $ = await request(apiUrl + `contrat=${contrat}` + `&start=${apiIndex}`)
    finalHtml += extractHtml($)
  }

  const bills = scrape(finalHtml)
  await saveBills(
    bills,
    { folderPath: folderPath },
    {
      identifiers: ['generali'],
      keys: ['date', 'amount', 'vendor'],
      contentType: 'application/pdf'
    }
  )
}

function extractHtml($) {
  const jsonArray = JSON.parse($.text())
  // Keep the only interesting json object with html part
  const jsonSubArray = jsonArray.filter(el => {
    return el.command === 'insert' && el.method === 'before'
  })
  return jsonSubArray[0].data
}

function hasMoreResults($) {
  const jsonArray = JSON.parse($.text())
  const jsonSubArray = jsonArray.filter(el => {
    return el.command === 'remove'
  })
  if (jsonSubArray.length === 0) {
    return true
  } else {
    log('debug', 'Detecting end of list')
    return false
  }
}

function scrape(html) {
  let bills = []
  $ = cheerio.load(html)
  $('.c-details__infos').each((index, el) => {
    let summary
    summary = parseSummary(el)
    $(el)
      .next('.panel-group')
      .find('.c-refund__panel')
      .each((index, subRow) => {
        const bill = parseSubRow(subRow, summary)
        bills.push(bill)
      })
  })
  return bills
}

function parseSummary(el) {
  const date = parseDate(
    $(el)
      .find('.c-details__result')
      .eq(0)
      .text()
  )
  const beneficiary = $(el)
    .find('.c-details__result')
    .eq(1)
    .text()
  const amount = parseFloat(
    $(el)
      .find('.c-details__result')
      .eq(2)
      .text()
      .slice(0, -2) // Remove ' €'
      .replace(' ', '') // Should parse amount >1000 if '1 000.01 €'
  )
  const currency = $(el)
    .find('.c-details__result')
    .eq(2)
    .text()
    .slice(-1) // Last character
  const subUrl = $(el)
    .find('.telecharger-reglement a')
    .attr('href')

  return { date, beneficiary, amount, currency, subUrl }
}

function parseSubRow(row, summary) {
  const subtype = $(row)
    .find('.col-sm-5')
    .text()
    .trim()
  const date = parseDate(
    $(row)
      .find('.col-sm-2')
      .eq(0)
      .text()
  ) //tomatch
  const beneficiary = $(row)
    .find('.col-sm-3')
    .text()
  const amount = parseFloat(
    $(row)
      .find('.col-sm-2')
      .eq(1)
      .text()
      .slice(0, -2) // Remove ' €'
      .replace(' ', '')
  ) // Should parse amount >1000 if '1 000.01 €'
  const currency = $(row)
    .find('.col-sm-2')
    .eq(1)
    .text()
    .slice(-1) // Last character
  const originalAmount = parseFloat(
    $(row)
      .find('.c-donuts__legends-price')
      .eq(0)
      .text()
      .slice(0, -2) // Remove ' €'
      .replace(' ', '')
  ) // Should parse amount >1000 if '1 000.01 €'
  const socialSecurityRefund = parseFloat(
    $(row)
      .find('.c-donuts__legends-details-price')
      .find('.c-donuts__legends-line .c-donuts__legends-price')
      .eq(0)
      .text()
      .slice(0, -2) // Remove ' €'
      .replace(' ', '')
  ) // Should parse amount >1000 if '1 000.01 €'
  let bill = {
    vendor: 'Generali',
    type: 'health_costs',
    isRefund: true,
    subtype,
    originalDate: date,
    beneficiary,
    amount,
    currency,
    originalAmount,
    socialSecurityRefund,
    date: summary.date,
    groupAmount: summary.amount
  }
  // Double check here, but it seems that Third party payer never have a pdf link
  if (summary.beneficiary !== 'Professionnel de Santé' || summary.subUrl) {
    bill = {
      ...bill,
      isThirdPartyPayer: false,
      fileurl: baseUrl + summary.subUrl,
      filename: `${formatDate(date)}_generali.pdf` // Refund date in filename
    }
  } else {
    bill = {
      ...bill,
      isThirdPartyPayer: true
    }
  }
  return bill
}
