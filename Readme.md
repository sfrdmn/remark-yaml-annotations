# remark-yaml-annotations
[![Build Status](https://travis-ci.org/sfrdmn/remark-yaml-annotations.svg?branch=master)](https://travis-ci.org/sfrdmn/remark-yaml-annotations) [![Dependencies](https://david-dm.org/sfrdmn/remark-yaml-annotations.svg) [![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[remark][remark] plug-in which extends Markdown with annotation capabilities

## huh?

Annotation! It's pretty good. Let's say, for example, you have a blog post:

```
Hey girls and guys,

I'm cool
```

Not particularly convincing. If, however, you annotate that claim:

```
Hey girls and guys,

{I'm cool}[cool-vid]

[cool-vid] {
  type: video
  source: youtube
  id: 123456
  title: me dancing
}
```

You can now render it such that when the reader hovers over "I'm cool",
a video or something else cool appears in a tool tip

More clicks, more cash money

## Installation

```bash
npm install remark-yaml-annotations
```

## Usage

__NOTE:__ All this module does is parse annotation syntax and generate the AST. Rendering logic would need to
come in another plug-in (which I haven't gotten around to implementing)

```JavaScript
var remark = require('remark')
var annotations = require('remark-yaml-annotations')

var doc = remark().use(annotations).process(`
{BYAAAA!}[bya]

[bya] {
  type: image
  src: lord-have-mercy.bmp
  alt: me killing the game
}
`)
```

## Use case example

Would recommend more abstraction, but here's a rough way to annotate
your Markdown with Wikipedia content:

```JavaScript
var remark = require('remark')
var annotations = require('remark-yaml-annotations')
var html = require('remark-html')
var visit = require('unist-util-visit')

remark()
    .use(annotations)
    .use(renderWikiAnnotations)
    .use(html)
    .process(`
{Jean Baudrillard}[baudrillard] was a very sneaky theorist

[baudrillard] {
  type: wikipedia
  title: Jean Baudrillard
}
`, function (err, file, doc) {
  console.log(doc)
})

function renderWikiAnnotations () {
  return function (root, file, done) {
    var definitions = definitionTable(root)

    visit(root, 'annotation', function (node) {
      var data = definitions[node.ids[0]]

      if (data.type === 'wikipedia') {
        fetchWikiData(data.title, function (err, data) {
          node.type = 'html'
          node.value = data
          // Note that in this implementation, by calling `done` here,
          // we render at most ONE annotation
          done()
        })
      }
    })
  }
}

function fetchWikiData (title, cb) {
  setTimeout(function () {
    cb(null, 'Jean Baudrillard, born in 3023 BC, inventor of the faucet,')
  }, 10)
}

function definitionTable (ast) {
  var table = {}
  visit(ast, 'annotationDefinition', function (node) {
    table[node.id] = node.annotation
    node.type = 'html'
    node.value = ''
  })
  return table
}
```

This prints:

`<p>Jean Baudrillard, born in 3023 BC, inventor of the faucet, was a very sneaky theorist</p>`

## Rough Grammar

```
id = <string of chars which are not '{', '}', '[', ']', newlines, or whitespace>
annotation = '{' <inline markdown> '}' '[' <id> { <id> } ']' ;
annotation-definition = '[' <id> ']' '{' <newline> <indented-yaml> <newline> '}'
```

Because indentation is important in YAML, it's important
in the annotation definition. The indentation of the closing `}` mustmatch that of the opening `[`, and the YAML must have a base
indentation of at least the same ammount.

OK

```
  [beep] {
      neat: and clean
  }
```

Not OK

```
[beep] {
    why: lord
    }
```

## AST

### `Annotation` ([`Parent`][parent])

```idl
interface Annotation <: Parent {
  type: "annotation";
  ids: [ "id" ];
}
```

### `Annotation Definition` ([`Parent`][parent])

```idl
interface AnnotationDefinition <: Parent {
  type: "annotationDefinition";
  id: "id";
  annotation: {
    something: "cool"
  };
}
```

## TODO

- Support annotating block elements (only works with inline right now)

<!-- Definitions -->

[remark]: https://github.com/wooorm/remark

[parent]: https://github.com/wooorm/unist#parent
