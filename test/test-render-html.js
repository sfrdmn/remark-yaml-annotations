var test = require('tape')
var remark = require('remark')
var annotations = require('..')
var html = require('remark-html')

test('test html rendering', function (t) {
  var parser = remark().use(annotations).use(html)
  t.ok(true, 'true is ok')
  t.equals(parser.process('{hi}[ok]').contents,
      '<p><span class="annotation" data-annotation-ids="ok">hi</span></p>\n',
      'annotation has correct default html output')

  t.equals(parser.process('[ok] {\n  msg: hi\n}').contents,
      '<div class="annotation-definition" data-annotation="{&quot;msg&quot;:&quot;hi&quot;}"></div>\n',
      'annotation definition has correct default html output')
  t.end()
})
