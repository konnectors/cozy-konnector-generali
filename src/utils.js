module.exports.parseDate = function parseDate(text) {
  const [d, m, y] = text.split('/', 3).map(e => parseInt(e, 10))
  return new Date(y, m - 1, d)
}

module.exports.parseAmount = function parseAmount(amount) {
  return parseFloat(
    amount
      .slice(0, -2) // Remove ' €'
      .replace(' ', '') // Should parse amount >1000 if '1 000.01 €'
  )
}

module.exports.formatDate = function formatDate(date) {
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
