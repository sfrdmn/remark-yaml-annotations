/**
 * Annotation tokenizer
 * EBNF:
 *  annotation = '[', { utf8 except [] and newline | '\[' | '\]' }, ']',
 *               '{', { utf8 except {} and newline | '\{' | '\}' }, '}' ;
 */
function annotation (eat, value, silent) {
  var match = /\[((?:[^\[\]\\]|\\.)*)\]\{((?:[^\{\}\\]|\\.)*)\}/

  if (match) {
    if (silent) return true

    var text = match[1]
    var id = match[2]

    return eat(match[0])({
      type: 'annotation',
      text: text,
      id: id
    })
  }
}

function annotationLocator (value, fromIndex) {
  return value.indexOf('[', fromIndex)
}

/**
 * Annotation definition tokenizer
 *
 * EBNF:
 *  annotation definition = '{', { utf8 except {} and newline | '\{' | '\}' }, '}'
 *                          '[', { map pairs }, ']' ;
 *
 *  map pairs = { { space }, ':', key, { space }, value, { space } } ;
 *
 *  key = { utf8 except whitespace } ;
 *
 *  value = string | literal string | prose ;
 *
 *  string = { utf8 except : | '\:' } ;
 *
 *  literal string = ( '"""', { utf8 except """ }, '"""' ) |
 *                   ( "'''", { utf8 except ''' }, "'''" ) ;
 *
 *  prose = ( '"', { utf8 except " | '\"' }, '"' ) |
 *          ( "'", { utf8 except ' | "\'" }, "'" ) ;
 */
function annotationDefinition (eat, value, silent) {
  var match = /\{((?:[^\{\}\\]|\\.)*)\}\[((?:[^\[\]\\]|\\.|[\n\r])*)\]/.exec(value)

  if (match) {
    if (silent) return true

    var id = match[1]
    var mapPairs = match[2]
  }
}

function annotationAttacher (remark, options) {
  var parser = remark.Parser.prototype

  // Add annotation declaration tokenizer
  parser.inlineTokenizers.annotation = annotation
  parser.inlineMethods.splice(
      parser.inlineMethods.indexOf('link'), 0, 'annotation')
  // Add annotation definition tokenizer
  parser.blockTokenizers.annotationDefinition = annotationDefinition
  parser.blockMethods.push('annotationDefinition')
}

annotation.locator = annotationLocator
annotation.notInLink = true

annotationDefinition.notInLink = true

module.exports = annotationAttacher
