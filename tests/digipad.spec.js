const { encode, deduce } = require('../lib/digipad')

test('deduce', function () {
  expect(deduce.size).toBe(10)
  const digits = []
  deduce.forEach(function (value, key, map) { digits.push(value) })
  expect(digits.sort()).toEqual('0123456789'.split('').sort())
})

const table = new Map([
  ['0', 'a'],
  ['1', 'b'],
  ['2', 'c'],
  ['3', 'd'],
  ['4', 'e'],
  ['5', 'f'],
  ['6', 'g'],
  ['7', 'h'],
  ['8', 'i'],
  ['9', 'j']
])

test('encode', function () {
  const passcode = '010203'
  expect(encode(passcode, table)).toEqual('a|b|a|c|a|d|')
})
