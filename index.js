var yaml = require('js-yaml')

function whitespace (ch) {
  return (/\s/.test(ch) && ch !== '\n')
}

function identifier (ch) {
  return ch !== '{' && ch !== '}' &&
      ch !== '[' && ch !== ']' &&
      !whitespace(ch) && ch !== '\n'
}

// Eat all whitepace except newlines
function eatWhitespace (value) {
  var length = value.length
  return function (i) {
    while (i < length && whitespace(value.charAt(i))) i++
    return [i]
  }
}

// Eat all whitespace _including_ newlines
function eatAllspace (value) {
  var length = value.length
  return function (i) {
    var ch = value.charAt(i)
    while (i < length && (whitespace(ch) || ch === '\n'))
      ch = value.charAt(++i)
    return [i]
  }
}

// Eat all blank lines
function eatBlanks (value) {
  var length = value.length
  return function (i) {
    while (i < length) {
      var match = /^([ \t\r]*\n)/.exec(value.slice(i))
      if (match)
        i += match[0].length
      else
        break
    }
    return [i]
  }
}

function eatCharacter (value) {
  var length = value.length
  return function (ch) {
    return function (i) {
      if (i < length && value.charAt(i) === ch)
        return [i + 1]
      else
        return new Error('Expected \'' + prettyChar(ch) + '\' but got \'' +
            prettyChar(value.charAt(i)) + '\'')
    }
  }
}

function parseIdentifier (value, data) {
  var length = value.length

  function parseid (i) {
    var ch
    var id = ''
    while (i < length && identifier(ch = value.charAt(i))) {
      id += ch
      i++
    }
    if (id) {
      var data = {}
      data[parseid.key] = id
      return [i, data]
    } else {
      return new Error('No id')
    }

  }
  parseid.key = 'id'

  return parseid
}

function parseYamlString (value) {
  var length = value.length
  return function (i, data) {
    var yamlBlockPattern = new RegExp('^([ \t\r]*\n)|([ \t\r]{' + data.yamlIndent + '}[^}])')
    var j = i
    while (j < length && yamlBlockPattern.test(value.slice(j))) {
      var end = value.indexOf('\n', j)
      if (end !== -1) j = end + 1
      else return new Error('Unclosed YAML block?')
    }
    var yamlString = removeIndent(value.slice(i, j), data.yamlIndent).trim()
    return [j, {yamlString: yamlString}]
  }
}

function recordIndentation (value) {
  return function (key) {
    var data = {}
    return function (i) {
      data[key] = getIndent(value, i)
      return [i, data]
    }
  }
}

function assertion (value) {
  return function (pred, errMsg) {
    return function (i, data) {
      if (pred(value.charAt(i), data)) return [i]
      else return new Error(errMsg)
    }
  }
}

function sequence (value) {
  var length = value.length
  return function (parsers, i) {
    i = i > 0 ? i : 0
    var data = {}
    for (var j = 0; i < length && j < parsers.length; j++) {
      var result = parsers[j](i, data)
      if (isError(result)) return result
      i = result[0]
      if (result[1]) data = Object.assign(data, result[1])
    }
    return [i, data]
  }
}

function eatIndentation (value) {
  return function (key) {
    return function (i, data) {
      var indent = typeof key === 'number' ? key : data[key]
      if (getIndent(value, i) === indent)
        return [i + indent]
      else
        return new Error('Expected indentation of \'' + indent +
            '\' but got \'' + getIndent(value, i) + '\'')
    }
  }
}

// Parse string within delimited block
function parseBlock (value) {
  var length = value.length
  return function (key, start, end) {
    var body = ''
    return function (i) {
      var blockStart = value.charAt(i++)
      if (blockStart !== start)
        return new Error('Expected block start \'' + start +
            '\' but got \'' + prettyChar(blockStart) + '\'')
      while (i < length) {
        var ch = value.charAt(i++)
        if (ch !== end || (ch === end && value.charAt(i - 1) === '\\')) {
          body += ch
        } else {
          var data = {}
          data[key] = body
          return [i, data]
        }
      }
      return new Error('Unclosed block?')
    }
  }
}

// Similar to regex '+'
function parseListPlus (value) {
  var length = value.length
  return function (key, itemParser, delim) {
    var delimParser = typeof delim === 'function'
        ? delim
        : eatCharacter(value)(delim)
    return function (i) {
      var list = []
      var buffer = ''
      while (i < length) {
        var itemResult = itemParser(i)
        if (isError(itemResult)) break
        list.push(itemResult[1][itemParser.key])
        var delimResult = delimParser(itemResult[0])
        if (isError(delimResult)) break
        i = delimResult[0]
      }
      if (!list.length) {
        return new Error('Need at least one item in list')
      } else {
        var data = {}
        data[key] = list
        return [i, data]
      }
    }
  }
}

function isError (value) {
  return value instanceof Error
}

function prettyChar (ch) {
  if (ch === '\n')
    return 'newline'
  else if (/\s/.test(ch))
    return 'whitespace'
  else
    return ch
}

function prettyPos (pos) {
  return pos.start.line + ':' + pos.start.column
}

function getIndent (value, i) {
  var indent = 0
  for (var j = i; j < value.length && whitespace(value.charAt(j)); j++) {
    indent += getIndent.indentMap[value.charAt(j)] || 0
  }
  return indent
}

getIndent.indentMap = {' ': 1, '\t': 4}

function removeIndent (buffer, indent) {
  if (!indent) return buffer
  return buffer.split('\n').map(function (line) {
    return !line ? '' : line.slice(indent)
  }).join('\n')
}

function addIndent (buffer, indent) {
  buffer = buffer || ''
  if (!indent) return buffer
  for (var i = 0, space = ''; i < indent; i++) space += ' '
  return buffer.split('\n').map(function (line) {
    return !line ? '' : space + line
  }).join('\n')
}

function visitPostOrder (fn) {
  return function map (ast) {
    if (ast.children && ast.children.length)
      ast.children.forEach(map)
    return fn(ast)
  }
}

function visitType (type) {
  return function (fn) {
    return function (ast) {
      visitPostOrder(function (node) {
        if (node.type === type) return fn(node)
        else return node
      })(ast)
    }
  }
}

function annotationLocator (value, fromIndex) {
  for (var i = fromIndex; i < value.length; i++) {
    if (value[i] === '{') {
      if (value[i - 1] === '\\') continue
      else return i
    }
  }
  return -1
}

function annotationTokenizer (eat, value, silent) {
  var eatws = eatWhitespace(value)
  var eatch = eatCharacter(value)
  var parseblock = parseBlock(value)
  var parseid = parseIdentifier(value)
  var plus = parseListPlus(value)

  var result = sequence(value)([
    eatws, parseblock('annotatedSection', '{', '}'), eatws,
    eatch('['), eatws, plus('ids', parseid, eatws), eatws, eatch(']'),
  ])

  if (isError(result)) return

  eat(value.slice(0, result[0]))({
    type: 'annotation',
    ids: result[1].ids,
    data: {
      htmlName: 'span',
      htmlAttributes: {
        'class': 'annotation',
        'data-annotation-ids': result[1].ids.join(' '),
      },
    },
    children: this.tokenizeInline(result[1].annotatedSection, 0),
  })
}

annotationTokenizer.locator = annotationLocator

function annotationDefinitionTokenizer (eat, value, silent) {
  var eatws = eatWhitespace(value)
  var eatas = eatAllspace(value)
  var eatblank = eatBlanks(value)
  var eatch = eatCharacter(value)
  var eatindent = eatIndentation(value)
  var parseid = parseIdentifier(value)
  var parseyamlstr = parseYamlString(value)
  var recordindent = recordIndentation(value)
  var assertYamlIndent = assertion(value)(function (ch, data) {
    return data.yamlIndent >= data.blockIndent
  }, 'YAML indentation must be >= annotation block indentation')

  var result = sequence(value)([
    recordindent('blockIndent'),
    eatws, eatch('['), eatws, parseid, eatws, eatch(']'),
    eatas, eatch('{'), eatws, eatch('\n'),
    eatblank,
    recordindent('yamlIndent'),
    assertYamlIndent,
    parseyamlstr,
    eatindent('blockIndent'),
    eatch('}'), eatws, eatch('\n'),
  ])

  if (isError(result)) return

  var data, yamlError
  try {
    data = yaml.safeLoad(result[1].yamlString || '')
  } catch (err) {
    data = {}
    yamlError = err
  }

  eat(value.slice(0, result[0]))({
    type: 'annotationDefinition',
    yamlString: result[1].yamlString,
    yamlError: yamlError,
    id: result[1].id,
    annotation: data,
    data: {
      htmlName: 'div',
      htmlAttributes: {
        'class': 'annotation-definition',
        'data-annotation': JSON.stringify(data),
      },
      htmlContent: '',
    },
    children: [],
  })
}

function annotationCompiler (token) {
  return '{' + this.block(token) + '}[' + token.ids.join(' ') + ']'
}

function annotationDefinitionCompiler (token) {
  return '[' + token.id + '] {\n' + addIndent(token.yamlString, 2) + '\n}'
}

// Responsible for error reporting
function annotationTransformer (ast, file) {
  // Build an ID table
  var ids = {}

  visitType('annotationDefinition')(function (node) {
    if (node.yamlError)
      file.warn(node.yamlError)
    if (ids[node.id])
      file.warn('Multiple annotation definitions with same ID: ' + node.id)
    ids[node.id] = true
  })(ast)

  visitType('annotation')(function (node) {
    node.ids.forEach(function (id) {
      if (!ids[id])
        file.warn('Annotation at ' + prettyPos(node.position) +
            ' references non-existent definition \'' + id + '\'')
    })
  })(ast)
}

module.exports = function annotationAttacher (ast, options) {
  options = options || {}
  options.renderers = options.renderers || []
  var pproto = ast.Parser.prototype
  var cproto = ast.Compiler.prototype
  var inlineMethods = pproto.inlineMethods
  var blockMethods = pproto.blockMethods
  pproto.inlineTokenizers.annotation = annotationTokenizer
  pproto.blockTokenizers.annotationDefinition = annotationDefinitionTokenizer
  cproto.visitors.annotationDefinition = annotationDefinitionCompiler
  cproto.visitors.annotation = annotationCompiler

  inlineMethods.splice(inlineMethods.indexOf('link'), 0,
      'annotation')
  blockMethods.splice(blockMethods.indexOf('footnoteDefinition'), 0, 'annotationDefinition')

  return annotationTransformer
}
