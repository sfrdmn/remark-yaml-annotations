/**
 * annotation map = "[", { key, value }, "]"
 * key = "~" { utf8 except : with escaped }
 * value = string | literal string | prose
 * string = { utf8 except : \n with escaped }
 * literal string = '"""', [ { \w+ } ] 
 */

var Parsimmon = require('parsimmon')
var lazy = Parsimmon.lazy
var string = Parsimmon.string
var regex = Parsimmon.regex
var seq = Parsimmon.seq
var custom = Parsimmon.custom
var alt = Parsimmon.alt
var succeed = Parsimmon.succeed
var whitespace = Parsimmon.optWhitespace

var annotation = lazy('annotation', function () {
  return seq(annotationSpan, annotationId)
})
var annotationDefinition = lazy('annotationDefinition', function () {
  return seq(annotationId, annotationMap)
})
var annotationSpan = enclosed('[', ']')
var annotationId = enclosed('{', '}')
var annotationMap = lazy('annotationMap', function () {
  return string('[')
      .then(mapPair.many().map(toObj))
      .skip(seq(whitespace, string(']')))

  function toObj (pairs) {
    return pairs.reduce(function (obj, pair) {
      obj[pair[0]] = pair[1]
      return obj
    }, {})
  }
})
var mapPair = lazy('mapPair', function () {
  return seq(key, value)
})
var key = lazy('key', function () {
  return whitespace.then(seq(string(':'), regex(/([^\w:\\]|\\:)+/)))
})
var value = lazy('value', function () {
  return whitespace.then(alt(string, prose, literalString))
})
var string = enclosed(':', ':')
var literalString = alt(multiline('"""'), multiline("'''"))
var prose = lazy('prose', function () {
  return alt(multiline('"', proseBody), multiline("'", proseBody))
      .map(function (body) {
  })
})
var proseBody = lazy('proseBody', function () {
  var 
})


function multiline (bound, parser) {
  var head = bound.charAt(0)
  var chunk = bound.length
  var delimiter = string(bound)
  var initialWhitespace = regex(/(\w*$)?/
  parser = parser || body()

  return seq(delimiter, whitespace).then(parser).skip(seq(whitespace, delimiter))

  function body () {
    return custom(function (success, failure) {
      return function (stream, i) {
        var start = i = i
        while (i < stream.length) {
          if (stream.charAt(i) === head && stream.slice(i, chunk) === bound)
            return success(i + chunk, stream.slice(start, i))
          i++
        }
        failure(i, 'reached end of input without closing `' + bound + '`')
      }
    })
  }
}

/**
 * Match all chars except delimiters unless back-escaped
 * Trims beginning and trailing whitespace
 */
function enclosed (open, close) {

  return string(open).then(body()).skip(string(close))

  function body () {
    return whitespace.then(custom(function (success, failure) {
      return function (stream, i) {
        var ch = stream.charAt(i)
        var start = i

        while (ch !== close && i < stream.length) {
          if (ch === open && stream.charAt(i - 1) !== '\\')
            return failure(i, 'unescaped delimiter `' + ch + '` in enclosed sequence')
          else if (/(\n)/.test(ch))
            return failure(i, 'newline in enclosed sequence')
          ch = stream.charAt(++i)
        }
        end = i
        // Trim trailing whitespace
        while (/\w/.test(stream.charAt(end - 1))) end--

        return success(i, stream.slice(start, end))
      }
    }))
  }
}


function escape (s) {
  return '\\' + s
}

function parseDeclaration (src) {

}

function parseDefinition (src) {

}

module.exports = {
  parseDeclaration: parseDeclaration,
  parseDefinition: parseDefinition
}
