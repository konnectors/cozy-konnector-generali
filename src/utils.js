module.exports.arrayFrom$row = function arrayFrom$row($, $row) {
  return Array.from($row).map(cell => getText($(cell)))
}

module.exports.parseDate = function parseDate(text) {
  const [d, m, y] = text.split('/', 3).map(e => parseInt(e, 10))
  return new Date(y, m - 1, d)
}

module.exports.parseAmount = function parseAmount(amount) {
  return parseFloat(amount.replace(',', '.'))
}

const getText = (module.exports.getText = function($cell) {
  return $cell.text().trim()
})

module.exports.formatName = function formatName(lastFirstName) {
  let fullName = lastFirstName
    .replace(/\s+/, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
    .split(' ')

  let firstName = fullName.pop()
  fullName.unshift(firstName)
  return fullName.join(' ')
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
