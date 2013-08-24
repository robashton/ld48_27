;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var domReady = require('domready')
  , rect = require('./game/rect')
  , physics = require('./game/physics')
  , core = require('./game/core')
  , input = require('./game/input')

domReady(function() {
  var canvas = document.getElementById('game')
    , context = canvas.getContext('2d')
    , player = rect.create(320, 240, 3, 3)
    , enemies = core.repeat(100, spawnEnemy)
  
  input.init(canvas)

  setInterval(function() {
    clear(context, canvas)
    player = physics.apply(player)
    player = input.apply(player)
    enemies = core.map(enemies, physics.apply)
    enemies = core.map(enemies, rect.gravitateTowards, player, 0.01)
    drawPlayer(context, player)
    drawEnemies(context, enemies)
  }, 1000/30)
})

function clear(context, canvas) {
  context.fillStyle = '#000'
  context.fillRect(0,0, canvas.width, canvas.height)
}

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
function drawPlayer(context, player) {
  rect.draw(context, player)
}

function drawEnemies(context, enemies) {
  core.each(enemies, function(enemy) { rect.draw(context, enemy) })
}

},{"./game/core":2,"./game/input":3,"./game/physics":4,"./game/rect":5,"domready":6}],2:[function(require,module,exports){
var each = exports.each = function(items, fn) {
  var fnArgs = extraArguments(arguments)
  fnArgs.unshift(null)
  for(var i = 0 ; i < items.length; i++) {
    fnArgs[0] = items[i]
    fn.apply(this, fnArgs)
  }
}
function extraArguments(items) {
  var fnArgs = [].slice.call(items)
  if(fnArgs.length > 2)
    fnArgs.splice(0, 2)
  return fnArgs
}
var map = exports.map = function(items, fn) {
  var fnArgs = extraArguments(arguments)
  fnArgs.unshift(null)
  for(var i = 0 ; i < items.length; i++) {
    fnArgs[0] = items[i]
    items[i] = fn.apply(this, fnArgs)
  }
  return items
}

var repeat = exports.repeat = function(times, fn) {
  var fnArgs = extraArguments(arguments)
  var result = new Array(times)
  for(var i = 0; i < times; i++)
    result[i] = fn.apply(this, fnArgs)
  return result
}

},{}],3:[function(require,module,exports){
var rect = require('./rect')

var _left = false,
    _right = false,
    _down = false,
    _up = false

 exports.init = function() {
   document.onkeydown = onKeyDown
   document.onkeyup = onKeyUp
 }

 exports.apply = function(player) {
   var x = _left ? -1 : _right ? 1 : 0 
     , y = _up ? -1 : _down ? 1 : 0
   return rect.applyImpulse(player, x, y, 0.1)
 }

 function onKeyDown(e) {
   onKeyChange(e, true)
 }
 function onKeyUp(e) {
   onKeyChange(e, false)
 }

 function onKeyChange(e, val) {
   switch(e.keyCode) {
     case 37:
      _left = val
      break;
     case 38:
      _up = val
      break;
     case 39:
      _right = val
      break;
     case 40:
      _down = val
      break;
   }
   return false
 }


},{"./rect":5}],4:[function(require,module,exports){
var apply = exports.apply = function(rect) {
  rect.x += rect.vx
  rect.y += rect.vy
  rect.vx *= (1.0 - rect.friction)
  rect.vy *= (1.0 - rect.friction)
  return restrictBoundsOf(rect)
}

function restrictBoundsOf(rect) {
  if((rect.x < 0 && rect.vx < 0) ||
    (rect.x > 640 && rect.vx > 0))
      rect.vx = -rect.vx
  if((rect.y < 0 && rect.vy < 0) ||
    (rect.y > 480 && rect.vy > 0))
      rect.vy = -rect.vy
  return rect
}

},{}],5:[function(require,module,exports){
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
    friction: 0.01,
    render: {
      colour: '#FFF'
    }
  }
}

exports.applyImpulse = function(rect, vx, vy, amount) {
  rect.vx += vx*amount;
  rect.vy += vy*amount;
  return rect
}

var vectorTo = function(src, dest) {
  var x = dest.x - src.x
    , y = dest.y - src.y
    , m = Math.sqrt((x*x)+(y*y))
  

  return {
    x: x/m,
    y: y/m
  }
}

exports.gravitateTowards = function(src, dest, power) {
  var vector = vectorTo(src, dest)
  src.vx += vector.x * power
  src.vy += vector.y * power
  return src
}

},{}],6:[function(require,module,exports){
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