var test = require('tape')
var remark = require('remark')
var annotations = require('..')

test('test parsing', function (t) {
  t.ok(true, 'true is ok')
  run('{hi}[ok]', function (ast, done) {
    var annotation = ast.children[0].children[0]
    t.equals(annotation.ids[0], 'ok', 'correct annotation ID')
    t.equals(annotation.children.length, 1, 'annotation has a single child')
    t.equals(annotation.children[0].type, 'text', 'annotation child is plain text')
    t.equals(annotation.children[0].value, 'hi', 'annotated text has correct value')
  })

  run('{_hi_}[ok]', function (ast) {
    var annotation = ast.children[0].children[0]
    t.equals(annotation.children[0].type, 'emphasis',
        'can annotate other inline text types')
  })

  run('{what\'s **up**}[greeting]', function (ast) {
    var annotation = ast.children[0].children[0]
    t.equals(annotation.children.length, 2,
        'annotating multiple inline types begets multiple children')
    t.deepEquals([annotation.children[0].type, annotation.children[1].type],
        ['text', 'strong'], 'annotation children have expected types')
    t.deepEquals([annotation.children[0].value, annotation.children[1].children[0].value],
        ['what\'s ', 'up'], 'annotation children have expected values')
  })

  run('{cool text my friend}[msg bibimbap]', function (ast) {
    var annotation = ast.children[0].children[0]
    t.equals(annotation.ids.length, 2, 'annotations can have multiple ids')
    t.deepEquals(annotation.ids, ['msg', 'bibimbap'],
        'annotation ids have expected values')
  })

  run('[ok] {\n  msg: hi\n}', function (ast) {
    var definition = ast.children[0]
    t.equals(definition.type, 'annotationDefinition',
        'can parse annotation definition')
    t.deepEquals(definition.annotation, {msg: 'hi'},
        'annotation definition has parsed yaml data')
  })

  run(`
  [   ok ]
  {

      message: |
        there was a man in the corner
        eyes feverish
        strange man was he

  }`, function (ast) {
    var definition = ast.children[0]
    t.ok(definition, 'can parse weird spacing')
    t.equals(definition.annotation.message,
        'there was a man in the corner\neyes feverish\nstrange man was he\n',
        'can parse prose like pros')
  })

  run(`
{Hello wassup}[ok]

[ok] {
  msg: yo
}`, function (ast) {
    var annotation = ast.children[0].children[0]
    var definition = ast.children[1]
    t.deepEquals(`${annotation.type} ${definition.type}`,
        'annotation annotationDefinition',
        'annotation and definition parsed correctly')
    t.equal(annotation.ids[0], definition.id,
        'annotation and annotation definition IDs match')
  })

  t.end()
})

function run (input, fn) {
  var parser = remark().use(annotations).use(function () { return fn })
  parser.process(input)
}
