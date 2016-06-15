var test = require('tape')
var remark = require('remark')
var annotations = require('..')

test('test default rendering', function (t) {
  var parser = remark().use(annotations)
  t.ok(true, 'true is ok')
  t.equals(parser.process('{hi}[ok]').contents, '{hi}[ok]\n',
      'can render simple annotation')
  t.equals(parser.process(`[ok] {
  msg: sup
}`).contents, `[ok] {
  msg: sup
}\n`, 'can render simple definition')
  t.equals(parser.process('{ sup  hello }[ beep   ]').contents, '{ sup  hello }[beep]\n',
      'annotations are normalized when rendered')
  t.equals(parser.process(`
  [ok]{
      beep: boop
      msg: |
        hello hello
  }
`).contents, `[ok] {
  beep: boop
  msg: |
    hello hello
}\n`, 'definitions are normalized when rendered')
  t.end()
})
