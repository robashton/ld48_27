;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var domReady = require('domready')
  , canvas = require('./game/canvas')
  , rect = require('./game/rect')
  , physics = require('./game/physics')
  , core = require('./game/core')
  , input = require('./game/input')
  , balancing = require('./game/balancing')

domReady(function() {
  var player = rect.create(canvas.halfwidth(), canvas.halfheight(), 3, 3)
    , enemies = core.repeat(100, spawnEnemy)
    , bullets = core.repeat(1000, createBullet)
  
  input.init()

  setInterval(function() {
    clear()
    player = physics.apply(player)
    player = input.applyImpulses(player)
    bullets = input.applyBullets(bullets, player)
    enemies = core.map(enemies, physics.apply)
    bullets = core.map(bullets, physics.apply)
    enemies = core.map(enemies, rect.gravitateTowards, player, balancing.enemyImpulse()) 
    rect.draw(player)
    core.each(enemies, function(enemy) { rect.draw(enemy) })
    core.each(bullets, function(bullet) { if(bullet.alive) rect.draw(bullet) })
  }, 1000/30)
})

function clear() {
  canvas.context().fillStyle = '#000'
  canvas.context().fillRect(0,0, canvas.width(), canvas.height())
}

function createBullet() {
  var bullet = rect.create(0,0,3,3)
  bullet.alive = false
  bullet.boundscheck = physics.boundskill
  bullet.friction = 0
  return bullet
}

function spawnEnemy() {
  var degrees = Math.random()  * (Math.PI * 2)
  var direction = vectorFromDegrees(degrees)
  return rect.create(
    canvas.halfwidth() * direction.x + canvas.halfwidth(), 
    canvas.halfheight()*direction.y + canvas.halfheight(), 5, 5)
}

function vectorFromDegrees(degrees) {
  return {
    x: Math.cos(degrees),
    y: Math.sin(degrees)
  }
}

},{"./game/balancing":2,"./game/canvas":3,"./game/core":4,"./game/input":5,"./game/physics":7,"./game/rect":8,"domready":9}],2:[function(require,module,exports){
exports.bulletspeed = function() {
  return 2.5
}

exports.enemyImpulse = function() {
  return 0.01
}

exports.playerImpulse = function() {
  return 0.1
}

},{}],3:[function(require,module,exports){

var _canvas = null
var canvas = exports.canvas = function() {
  return _canvas || (function() {
    _canvas = document.getElementById('game')
    return _canvas
  })()
}

var _context = null
exports.context = function() {
  return _context || (function() {
    _context = canvas().getContext('2d')
    return _context
  })()
}

exports.width = function() {
  return canvas().width
}

exports.halfwidth = function() {
  return canvas().width / 2
}

exports.left = function() {
  return canvas().offsetLeft
}

exports.top = function() {
  return canvas().offsetTop
}

exports.halfheight = function() {
  return canvas().height / 2
}

exports.height = function() {
  return canvas().height
}
 

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
var rect = require('./rect')
  , canvas = require('./canvas')
  , throttleit = require('throttleit')
  , maths = require('./maths')
  , balancing = require('./balancing')

var _left = false,
    _right = false,
    _down = false,
    _up = false,
    _firing = false,
    _firingLocation = {
      x: 0,
      y: 0
    },
    _firingMethod = null

 exports.init = function() {
   document.onkeydown = onKeyDown
   document.onkeyup = onKeyUp
   document.onmousedown = onMouseDown
   document.onmouseup = onMouseUp
   document.onmousemove = onMouseMove
   _firingMethod = throttleit(addBulletTo, 100)
 }

 exports.applyImpulses = function(player) {
   var x = _left ? -1 : _right ? 1 : 0 
     , y = _up ? -1 : _down ? 1 : 0
    return rect.applyImpulse(player, x, y, balancing.playerImpulse())
 }

 exports.applyBullets = function(existing, player) {
   if(!_firing) return existing
   return _firingMethod(existing, player)
 }

 function addBulletTo(existing, player) {
   var index = -1
   for(var i =0 ; i < existing.length; i++) {
     if(existing[i].alive) continue
     index = i
     break
   }
   if(index < 0) return existing 
   existing[index].alive = true
   existing[index].x = player.x
   existing[index].y = player.y
   var firingVector = maths.vectorBetween(
     player.x, player.y, 
     _firingLocation.x, _firingLocation.y)
   existing[index].vx = firingVector.x * balancing.bulletspeed()
   existing[index].vy = firingVector.y * balancing.bulletspeed()
   return existing
 }

 function onKeyDown(e) {
   onKeyChange(e, true)
 }
 function onKeyUp(e) {
   onKeyChange(e, false)
 }

 function onMouseMove(e) {
   _firingLocation.x = e.x - canvas.left()
   _firingLocation.y = e.y - canvas.top()
 }

 function onMouseDown() {
   _firing = true
   return false
 }

 function onMouseUp() {
   _firing = false
   return false
 }

 function onKeyChange(e, val) {
   switch(e.keyCode) {
     case 37:
     case 65:
      _left = val
      break;
    case 38:
    case 87:
      _up = val
      break;
    case 39:
    case 68:
      _right = val
      break;
    case 40:
    case 83:
      _down = val
      break;
   }
   return false
 }


},{"./balancing":2,"./canvas":3,"./maths":6,"./rect":8,"throttleit":10}],6:[function(require,module,exports){
exports.vectorBetween = function(srcx, srcy, destx, desty) {
  var x = destx - srcx
    , y = desty - srcy
    , m = Math.sqrt((x*x)+(y*y))
  return {
    x: x/m,
    y: y/m
  }
}

},{}],7:[function(require,module,exports){
var canvas = require('./canvas')

exports.apply = function(rect) {
  rect.x += rect.vx
  rect.y += rect.vy
  rect.vx *= (1.0 - rect.friction)
  rect.vy *= (1.0 - rect.friction)
  return rect.boundscheck(rect)
}

function outsideHorizontal(rect) {
  return (rect.x < 0 && rect.vx < 0) ||
    (rect.x > canvas.width() && rect.vx > 0)
}

function outsideVertical(rect) {
  return (rect.y < 0 && rect.vy < 0) ||
    (rect.y > canvas.height() && rect.vy > 0)
}

exports.boundskill = function(rect) {
  if(outsideHorizontal(rect) || outsideVertical(rect))
    rect.alive = false
  return rect
}

exports.boundsbounce = function(rect) {
  if(outsideHorizontal(rect))
      rect.vx = -rect.vx
  if(outsideVertical(rect))
      rect.vy = -rect.vy
  return rect
}

},{"./canvas":3}],8:[function(require,module,exports){
var canvas = require('./canvas')
  , maths = require('./maths')
  , physics = require('./physics')

exports.draw =  function(rect) {
  canvas.context().fillStyle = rect.render.colour
  canvas.context().fillRect(rect.x, rect.y, rect.w, rect.h)
}

exports.create = function(x, y, w, h) {
  return {
    x: x,
    y: y,
    w: w,
    h: h,
    vx: 0,
    vy: 0,
    alive: true,
    boundscheck: physics.boundsbounce,
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

var vectorTo = exports.vectorTo = function(src, dest) {
  return maths.vectorBetween(src.x, src.y, dest.x, dest.y)
}

exports.gravitateTowards = function(src, dest, power) {
  var vector = vectorTo(src, dest)
  src.vx += vector.x * power
  src.vy += vector.y * power
  return src
}

},{"./canvas":3,"./maths":6,"./physics":7}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){

/**
 * Module exports.
 */

module.exports = throttle;

/**
 * Returns a new function that, when invoked, invokes `func` at most one time per
 * `wait` milliseconds.
 *
 * @param {Function} func The `Function` instance to wrap.
 * @param {Number} wait The minimum number of milliseconds that must elapse in between `func` invokations.
 * @return {Function} A new function that wraps the `func` function passed in.
 * @api public
 */

function throttle (func, wait) {
  var rtn; // return value
  var last = 0; // last invokation timestamp
  return function throttled () {
    var now = new Date().getTime();
    var delta = now - last;
    if (delta >= wait) {
      rtn = func.apply(this, arguments);
      last = now;
    }
    return rtn;
  };
}

},{}]},{},[1])
;