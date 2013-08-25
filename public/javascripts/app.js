;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var domReady = require('domready')
  , canvas = require('./game/canvas')
  , rect = require('./game/rect')
  , physics = require('./game/physics')
  , core = require('./game/core')
  , input = require('./game/input')
  , balancing = require('./game/balancing')
  , text = require('./game/text')
  , maths = require('./game/maths')

domReady(function() {
  var btnStart = document.getElementById('start')
    , btnRestart = document.getElementById('restart')
    , introContainer = document.getElementById('intro')
    , playContainer = document.getElementById('play')
    , overContainer = document.getElementById('over')
    , scoreContainer = document.getElementById('score')
    , started = false

  btnStart.onclick = startGame
  btnRestart.onclick = startGame

  function endGame(score) {
    playContainer.style.display = 'none'
    overContainer.style.display = 'block'
    scoreContainer.innerText = score
    started = false
  }

  function startGame() {
    if(started) return
    started = true
    input.init()
    balancing.reset()


    introContainer.style.display = 'none'
    overContainer.style.display = 'none'
    playContainer.style.display = 'block'

    var player = createPlayer() 
      , enemies = core.repeat(100, createEnemy)
      , bullets = core.repeat(250, createBullet)
      , explosions = core.repeat(500, createExplosion)
      , powerups = core.repeat(10, createPowerup)
      , timeLeft = 10000
      , spawnTimer = -1
      , frameTime  = 1000 / 30
      , score = 0
      , health = 100
      , collisions = null
      , intervalTimer = 

    setInterval(function() {
      if(spawnTimer < 0) {
        spawnTimer = balancing.spawnTimer()
        balancing.levelup()
        enemies = spawnEnemies(enemies, balancing.enemySpawnCount())
      }

      if(health < 0 || timeLeft < 0 && player.alive) {
        blowUp(function() {
          input.shutdown()
          endGame(score)
          clearInterval(intervalTimer)
        })
      }

      function blowUp(cb) {
        player.alive = false
        explosions = addExplosionParticleTo(explosions, player, 100)
        setTimeout(cb, 5000)
      }

      // If you're looking at this and wondering WTF, then
      // basically, I decided to have a bit of fun with this and see about 
      // avoiding creating new objects, and avoid mutation unless the function returns
      // the new version of the object it has worked out in some places, and not in others
      // A fun experiment it was nonetheless even if it makes the code a bit wtf
      // I gave up on it after about 5 hours and was left with this pattern and decided to roll with it
      // cos undoing it would be harder than pressing on
      
      player = physics.apply(player)
      player = input.applyImpulses(player)
      bullets = input.applyBullets(bullets, player)

      enemies = core.updatein(enemies, physics.apply)
      bullets = core.updatein(bullets, physics.apply)
      explosions = core.updatein(explosions, physics.apply)
      enemies = core.updatein(enemies, rect.gravitateTowards, player, balancing.enemyImpulse()) 

      collisions = physics.collideLists(enemies, bullets)
      score = updateScoreFromCollisions(score, collisions)
      explosions = updateExplosionsFromCollisions(explosions, collisions, enemies)
      powerups = updatePowerupsFromCollisions(powerups, collisions, enemies)

      enemies = rect.killUsing(enemies, collisions, firstItemFromCollision)
      bullets = rect.killUsing(bullets, collisions, secondItemFromCollision)

      collisions = physics.collideWithList(player, powerups)
      health = updateHealthFromPowerups(health, collisions)
      timeLeft = updateTimeFromPowerups(timeLeft, collisions)
      powerups = rect.killUsing(powerups, collisions, firstItemFromCollision)
      explosions = updateExplosionsFromCollisions(explosions, collisions, powerups)

      collisions = physics.collideWithList(player, enemies)
      health = updateHealthFromCollisions(health, collisions)
      explosions = updateExplosionsFromCollisions(explosions, collisions, enemies)
      enemies = rect.killUsing(enemies, collisions, firstItemFromCollision)
      explosions = removeOldExplosions(explosions)
      enemies = pushEnemiesAwayFromCentre(enemies, player)

      spawnTimer -= frameTime
      timeLeft -= frameTime
      clear()

      drawPlayerHalo(player)
      rect.draw(player)
      core.each(enemies, rect.draw)
      core.each(bullets, rect.draw)
      core.each(explosions, rect.draw)
      core.each(powerups, rect.draw)
      drawTimeLeft(timeLeft)
      drawHealth(health)
      text.draw('Score: ' + score, 10, 20, 18)
    }, frameTime)
  }
})

function drawPlayerHalo(player) {
  canvas.context().beginPath();
  canvas.context().globalAlpha = 0.25
  canvas.context().fillStyle = '#0F0'
  canvas.context().arc(player.x + player.w/2, player.y + player.h/2, 7.5, 0, Math.PI*2, true); 
  canvas.context().closePath();
  canvas.context().fill();
  canvas.context().globalAlpha = 1.0
}

function drawTimeLeft(amount) {
  canvas.context().fillStyle = '#FF0'
  var height = (0.046 * amount)
  canvas.context().fillRect(635, 475 - height, 5, height)
}

function drawHealth(amount) {
  canvas.context().fillStyle = '#080'
  var height = (4.6 * amount)
  canvas.context().fillRect(628, 475 - height, 5, height)
}


function firstItemFromCollision(item) {
  return item.collision ? item.one : null
}

function secondItemFromCollision(item) {
  return item.collision ? item.two : null
}

function pushEnemiesAwayFromCentre(enemies, player) {
  var summary =  core.reduce(
    { x: 0, y: 0, maxindex: 0, count: 0},
    enemies,
    function(enemy) { return enemy },
    function(current, enemy) 
    { 
      if(!enemy.alive) return current
      current.x += enemy.x; current.y += enemy.y; 
      current.count++;
      current.maxindex = Math.max(current.maxindex, enemy.index); 
      return current })

  summary.x /= summary.count
  summary.y /= summary.count

  return core.updatein(enemies, function(enemy) {
    if(!enemy.alive) return enemy
      
    var vector = maths.vectorBetween(
        enemy.x, enemy.y, 
        summary.x + enemy.pushx, 
        summary.y + enemy.pushy )

    enemy.vx += vector.x * balancing.enemyImpulse() / 2
    enemy.vy += vector.y * balancing.enemyImpulse() / 2    
    return enemy
  })
}

function updateExplosionsFromCollisions(explosions, collisions, rects) {
  for(var i = 0 ; i < collisions.length; i++) {
    if(!collisions[i].collision) break
    explosions = addExplosionParticleTo(explosions, rects[collisions[i].one])
  }
  return explosions
}

function updatePowerupsFromCollisions(powerups, collisions, rects) {
  for(var i = 0 ; i < collisions.length; i++) {
    if(!collisions[i].collision) break
    if(Math.random() < balancing.powerupChance())
      spawnPowerup(powerups, 
        rects[collisions[i].one].x, 
        rects[collisions[i].one].y)
  }
  return powerups
}


function removeOldExplosions(explosions){
  core.updatein(explosions, function(item) {
    if(item.age > 200)
      item.alive = false
    return item
  })
  return explosions
}

function addExplosionParticleTo(explosions, rect, amount) {
  amount = amount || 20
  for(var i = 0 ; i < explosions.length; i++) {
    var item = explosions[i]
    if(item.alive) continue
    amount--
    item.alive = true
    item.age = 0
    item.x = rect.x
    item.y = rect.y
    item.render.colour = rect.render.colour
    item.vx = 0.5 - Math.random() + (rect.vx * 0.1),
    item.vy = 0.5 - Math.random() + (rect.vy * 0.1)
    if(amount <= 0) break;
  }
  return explosions
}

function updateHealthFromCollisions(health, collisions) {
  return health + core.reduce(
    0,
    collisions,
    function(item) { return item.collision ? balancing.level() : 0},
    function(current, x) { return current - x})
}

function updateHealthFromPowerups(health, collisions) {
  return Math.min(health + core.reduce(
    0,
    collisions,
    function(item) { return item.collision ? 10 : 0},
    function(current, x) { return current + x}), 100)
}

function updateTimeFromPowerups(time, collisions) {
  return Math.min(time + core.reduce(
    0,
    collisions,
    function(item) { return item.collision ? 10000 : 0},
    function(current, x) { return current + x}), 10000)
}

function updateScoreFromCollisions(score, collisions) {
  return score + core.reduce(
    0,
    collisions,
    function(item) { return item.collision ? balancing.level() : 0},
    function(current, x) { return current+x})
}

function clear() {
  canvas.context().globalAlpha = 0.2
  canvas.context().fillStyle = '#000'
  canvas.context().fillRect(0,0, canvas.width(), canvas.height())
  canvas.context().globalAlpha = 1.0
}

function createPlayer() {
  var player = rect.create(canvas.halfwidth(), canvas.halfheight(), 5, 5)
  player.render.image = 'player.png'
  player.friction = balancing.playerFriction()
  player.render.colour = '#0F0'
  return player
}

function createPowerup() {
  var powerup = rect.create(0,0,10,10)
  powerup.alive = false
  powerup.boundscheck = physics.boundskill
  powerup.friction = 0
  powerup.render.colour = '#FFFF00'
  powerup.render.image = 'powerup.png'
  return powerup
}

function createExplosion() {
  var particle = rect.create(0,0,2,2)
  particle.alive = false
  particle.boundscheck = physics.boundskill
  particle.friction = 0
  particle.render.colour = '#FF5721'
  return particle
}

function createBullet() {
  var bullet = rect.create(0,0,3,3)
  bullet.alive = false
  bullet.boundscheck = physics.boundskill
  bullet.friction = 0
  bullet.render.colour = '#88F'
  return bullet
}

function createEnemy() {
  var enemy = rect.create(0,0, 10, 10)
  enemy.alive = false
  enemy.boundscheck = physics.boundsbounce
  enemy.friction = 0.1

  switch(Math.floor(Math.random() * 4)) {
    case 0:
      enemy.render.colour = '#FF0'
      enemy.render.image = 'redenemy.png'
      break;
    case 1:
      enemy.render.colour = '#FF0'
      enemy.render.image = 'orangeenemy.png'
      break;
    case 2:
      enemy.render.colour = '#FF0'
      enemy.render.image = 'blueenemy.png'
      break;
    case 3:
      enemy.render.colour = '#FF0'
      enemy.render.image = 'greyenemy.png'
      break;
  }

  return enemy
}

function spawnPowerup(powerups, x, y) {
  for(var i = 0; i < powerups.length; i++) {
    if(powerups[i].alive) continue
    powerups[i].alive = true
    powerups[i].x = x
    powerups[i].y = y
    powerups[i].age = 0
    return powerups
  }
  return powerups
}

function spawnEnemies(enemies, count) {
  for(var i = 0; i < enemies.length; i++) {
    if(enemies[i].alive) continue
    var enemy = enemies[i]
    var degrees = Math.random()  * (Math.PI * 2)
    var direction = vectorFromDegrees(degrees)
    enemy.index = count
    enemy.alive = true
    enemy.vx = enemy.vy = 0
    enemy.friction = balancing.enemyFriction()
    enemy.x = canvas.halfwidth() * direction.x + canvas.halfwidth(), 
    enemy.y = canvas.halfheight() * direction.y + canvas.halfheight()
    enemy.pushx = 50 - Math.random() * 100
    enemy.pushy = 50 - Math.random() * 100
    enemy.render.colour = '#F00'
    if(count-- < 0) break;
  }
  return enemies
}

function vectorFromDegrees(degrees) {
  return {
    x: Math.cos(degrees),
    y: Math.sin(degrees)
  }
}

},{"./game/balancing":2,"./game/canvas":3,"./game/core":4,"./game/input":5,"./game/maths":6,"./game/physics":7,"./game/rect":8,"./game/text":9,"domready":10}],2:[function(require,module,exports){
var _level = 0

exports.reset = function() {
  _level = 0
}

exports.levelup = function() {
  _level++
}

exports.level = function() {
  return _level
}

exports.bulletspeed = function() {
  return 5
}

exports.spawnTimer = function() {
  return Math.max(3000 - (_level * 20), 1000)
}

exports.enemyImpulse = function() {
  return 0.05 + (_level * 0.001)
}

exports.playerImpulse = function() {
  return 0.1 + (_level * 0.01)
}

exports.playerFriction = function() {
  return 0.04
}

exports.enemyFriction = function() {
  return 0.1 - (_level * 0.001)
}

exports.powerupChance = function() {
  return Math.max(1.0 - (_level * 0.01), 0.2)
}

exports.enemySpawnCount = function() {
  return 2 + _level
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

var updatein = exports.updatein = function(items, fn) {
  var fnArgs = extraArguments(arguments)
  fnArgs.unshift(null)
  for(var i = 0 ; i < items.length; i++) {
    fnArgs[0] = items[i]
    items[i] = fn.apply(this, fnArgs)
  }
  return items
}

var reduce = exports.reduce = function(current, input, mapfn, reducefn) {
  for(var i =0 ; i < input.length; i++)
    current = reducefn(current, mapfn(input[i]))
  return current
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
   setupJoypad()
 }

  function setupJoypad() {
    // Perf is going to be too hard on mobile devices
  }

 exports.shutdown = function() {
   document.onkeydown = null
   document.onkeyup = null
   document.onmousedown = null
   document.onmouseup = null
   document.onmousemove = null
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
   if(index < 0) {
    return existing  
   }
   existing[index].alive = true
   existing[index].x = player.x
   existing[index].y = player.y

   var firingVector = maths.vectorBetween( player.x, player.y, _firingLocation.x, _firingLocation.y)
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
   _firingLocation.x = e.clientX
   _firingLocation.y = e.clientY
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


},{"./balancing":2,"./canvas":3,"./maths":6,"./rect":8,"throttleit":11}],6:[function(require,module,exports){
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
  , core = require('./core')

var _collisionBuffer = new Array(1000)
for(var i = 0 ; i < 1000; i++)
  _collisionBuffer[i] = { collision: false, one: 0, two: 0 }

exports.apply = function(rect) {
  if(!rect.alive) return rect
  rect.x += rect.vx
  rect.y += rect.vy
  rect.vx *= (1.0 - rect.friction)
  rect.vy *= (1.0 - rect.friction)
  rect.age += 1
  return rect.boundscheck(rect)
}


exports.collideWithList = function(rect, list) {
  var current = 0
  _collisionBuffer = core.updatein(_collisionBuffer, clearCollision)
  for(var i = 0; i < list.length; i++) {
    if(!collide(list[i], rect)) continue
      _collisionBuffer[current].collision = true
      _collisionBuffer[current++].one = i
  }
  return _collisionBuffer
}


function clearCollision(item) {
  item.collision = false
  return item
}


exports.collideLists = function(one, two) {
  var current = 0
  _collisionBuffer = core.updatein(_collisionBuffer, clearCollision)
  for(var i = 0; i < one.length; i++) {
    for(var j = 0 ; j < two.length; j++) {
      if(!collide(one[i], two[j])) continue
      _collisionBuffer[current].collision = true
      _collisionBuffer[current].one = i
      _collisionBuffer[current++].two = j 
    }
  }
  return _collisionBuffer
}

var collide = exports.collide = function(one, two) {
  if(!one.alive || !two.alive) return false
  if(one.x + one.w < two.x) return false
  if(one.y + one.h < two.y) return false
  if(two.x + two.w < one.x) return false
  if(two.y + two.h < one.y) return false
  return true
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

exports.boundsthrough = function(rect) {
  if(rect.x < 0) {
    rect.x = canvas.width() - 1
  }
  if(rect.x > canvas.width()) {
    rect.x = 1
  }
  if(rect.y < 0) {
    rect.y = canvas.height() - 1
  }
  if(rect.y > canvas.height()) {
    rect.y = 1
  }
  return rect
}

exports.boundsbounce = function(rect) {
  if(outsideHorizontal(rect))
      rect.vx = -rect.vx
  if(outsideVertical(rect))
      rect.vy = -rect.vy
  return rect
}

},{"./canvas":3,"./core":4}],8:[function(require,module,exports){
var canvas = require('./canvas')
  , maths = require('./maths')
  , physics = require('./physics')

var _images = { }

function image(path) {
  return _images[path] || (function() {
    _images[path] = new Image()
    _images[path].src = path
    return _images[path]
  })()
}

exports.draw =  function(rect) {
  if(!rect.alive) return
  if(rect.render.image) {
    canvas.context().drawImage(image(rect.render.image), 
      rect.x, rect.y, rect.w, rect.h)
  } else {
    canvas.context().fillStyle = rect.render.colour
    canvas.context().fillRect(rect.x, rect.y, rect.w, rect.h)
  }
}

exports.create = function(x, y, w, h) {
  return {
    x: x,
    y: y,
    w: w,
    h: h,
    vx: 0,
    vy: 0,
    index: 0,
    alive: true,
    age: 0,
    boundscheck: physics.boundsthrough,
    friction: 0.01,
    pushx: 0,
    pushy: 0,
    render: {
      colour: '#FFF'
    }
  }
}

exports.killUsing = function(rects, list, fn) {
  for(var i =0 ; i < list.length; i++) {
    var index = fn(list[i])
    if(index === null) return rects
    rects[index].alive = false
  }
  return rects
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
var canvas = require('./canvas')

exports.draw = function(text, x, y, size) {
  canvas.context().font = 'italic ' + size + 'pt Calibri';
  canvas.context().fillStyle = '#FFF'
  canvas.context().fillText(text, x, y)
}

},{"./canvas":3}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){

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