;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var domReady = require('domready')
  , rect = require('./game/rect')
  , physics = require('./game/physics')


domReady(function() {
  var canvas = document.getElementById('game')
    , context = canvas.getContext('2d')
    , player = rect.create(320, 240, 3, 3)
    , enemies = repeat(100, spawnEnemy)

  setInterval(function() {
    context.fillStyle = '#000'
    context.fillRect(0,0, canvas.width, canvas.height)
    player = physics.apply(player)
    enemies = updateEach(enemies, physics.apply)
    drawPlayer(context, player)
    drawEnemies(context, enemies)
  }, 1000/30)
})

function spawnEnemy() {
  var degrees = Math.random()  * (Math.PI * 2)
  var direction = vectorFromDegrees(degrees)
  return rect.create(320 * direction.x + 320, 240*direction.y + 240, 3, 3)
}

function vectorFromDegrees(degrees) {
  return {
    x: Math.cos(degrees),
    y: Math.sin(degrees)
  }
}

function updateEach(items, fn) {
  for(var i = 0 ; i < items.length; i++) {
    items[i] = fn(items[i])
  }
  return items
}

function repeat(times, fn) {
  var result = new Array(times)
  for(var i = 0; i < times; i++)
    result[i] = fn()
  return result
}

function each(items, fn) {
  for(var i = 0 ; i < items.length; i++) {
    fn(items[i])
  }
}

function drawPlayer(context, player) {
  rect.draw(context, player)
}

function drawEnemies(context, enemies) {
  each(enemies, function(enemy) { rect.draw(context, enemy) })
}



},{"./game/physics":2,"./game/rect":3,"domready":4}],2:[function(require,module,exports){
var apply = exports.apply = function(rect) {
  rect.x += rect.vx
  rect.y += rect.vy
  return rect
}

},{}],3:[function(require,module,exports){
var draw = exports.draw =  function(context, rect) {
  context.fillStyle = rect.render.colour
  context.fillRect(rect.x, rect.y, rect.w, rect.h)
}

var create = exports.create = function(x, y, w, h) {
  return {
    x: x,
    y: y,
    w: w,
    h: h,
    vx: 0,
    vy: 0,
    render: {
      colour: '#FFF'
    }
  }
}

},{}],4:[function(require,module,exports){
/*!
  * domready (c) Dustin Diaz 2012 - License MIT
  */
!function (name, definition) {
  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()
}('domready', function (ready) {

  var fns = [], fn, f = false
    , doc = document
    , testEl = doc.documentElement
    , hack = testEl.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , addEventListener = 'addEventListener'
    , onreadystatechange = 'onreadystatechange'
    , readyState = 'readyState'
    , loadedRgx = hack ? /^loaded|^c/ : /^loaded|c/
    , loaded = loadedRgx.test(doc[readyState])

  function flush(f) {
    loaded = 1
    while (f = fns.shift()) f()
  }

  doc[addEventListener] && doc[addEventListener](domContentLoaded, fn = function () {
    doc.removeEventListener(domContentLoaded, fn, f)
    flush()
  }, f)


  hack && doc.attachEvent(onreadystatechange, fn = function () {
    if (/^c/.test(doc[readyState])) {
      doc.detachEvent(onreadystatechange, fn)
      flush()
    }
  })

  return (ready = hack ?
    function (fn) {
      self != top ?
        loaded ? fn() : fns.push(fn) :
        function () {
          try {
            testEl.doScroll('left')
          } catch (e) {
            return setTimeout(function() { ready(fn) }, 50)
          }
          fn()
        }()
    } :
    function (fn) {
      loaded ? fn() : fns.push(fn)
    })
})
},{}]},{},[1])
;