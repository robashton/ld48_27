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
  , GC = require('game-controller')

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
      , enemies = core.repeat(500, createEnemy)
      , bullets = core.repeat(1000, createBullet)
      , explosions = core.repeat(5000, createExplosion)
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

},{"./game/balancing":2,"./game/canvas":3,"./game/core":4,"./game/input":5,"./game/maths":6,"./game/physics":7,"./game/rect":8,"./game/text":9,"domready":10,"game-controller":11}],2:[function(require,module,exports){
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
  , GC = require('game-controller')

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
//    GC.GameController.init( { 
//      canvas: 'game',
//      left: {
//        type: 'joystick', 
//        position: { left: '15%', bottom: '15%' },
//        touchMove: function( details ) {
//          console.log( details.dx );
//          console.log( details.dy );
//          console.log( details.max );
//          console.log( details.normalizedX );
//          console.log( details.normalizedY );
//        }
//      }, 
//      right: { 
//        type: 'joystick', 
//        position: { right: '15%', bottom: '15%' } ,
//        touchMove: function( details ) {
//            // Do something...
//        }
//      }
//    });

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
   _firingLocation.x = e.screenX - canvas.left()
   _firingLocation.y = e.screenY - canvas.top()
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


},{"./balancing":2,"./canvas":3,"./maths":6,"./rect":8,"game-controller":11,"throttleit":12}],6:[function(require,module,exports){
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
 * Helpers 
 */
( function(exports) {
	var __slice = [].slice;
	var __hasProp = {}.hasOwnProperty;
	var __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };
	/* $.extend functionality */
	function extend( target, src )
	{
		var options, name, copy, copyIsArray, clone,
			i = 1,
			length = 2,
			deep = true;
	
		// Handle a deep copy situation
		if( typeof target === "boolean" )
		{
			deep = target;
			// skip the boolean and the target
			i = 2;
		}
	
		// Handle case when target is a string or something( possible in deep copy )
		if( typeof target !== "object" && !typeof target === 'function' )
		{
			target = {};
		}
		// Only deal with non-null/undefined values
		if( options = src )
		{
			// Extend the base object
			for( name in options )
			{
				src = target[name];
				copy = options[name];
	
				// Prevent never-ending loop
				if( target === copy )
				{
					continue;
				}
				// Recurse if we're merging plain objects or arrays
				if( deep &&( typeof copy == 'object' ||( copyIsArray = Object.prototype.toString.call(  copy  ) === '[object Array]' ) ) ) 
				{
					if( copyIsArray ) 
					{
						copyIsArray = false;
						clone = src && Object.prototype.toString.call(  src  ) === '[object Array]' ? src : [];
	
					} 
					else 
					{
						clone = src && typeof src == 'object' ? src : {};
					}
					// Never move original objects, clone them
					target[name] = extend( clone, copy );
	
					// Don't bring in undefined values
				} 
				else if( typeof copy !== 'undefined' ) 
				{
					target[name] = copy;
				}
			}
		}
		return target;
	}
	
	// Make available to window
	exports.GameController = {
		
		// Default options,
		options: {
			left: { 
				type: 'dpad', 
				position: { left: '13%', bottom: '22%' },
				dpad: {
					up: {
						width: '7%',
						height: '15%',
						stroke: 2,
						touchStart: function() {
							GameController.simulateKeyEvent( 'press', 38 );
							GameController.simulateKeyEvent( 'down', 38 );
						},
						touchEnd: function() {
							GameController.simulateKeyEvent( 'up', 38 );
						}
					},
					left: {
						width: '15%',
						height: '7%',
						stroke: 2,
						touchStart: function() {
							GameController.simulateKeyEvent( 'press', 37 );
							GameController.simulateKeyEvent( 'down', 37 );
						},
						touchEnd: function() {
							GameController.simulateKeyEvent( 'up', 37 );
						}
					},
					down: {
						width: '7%',
						height: '15%',
						stroke: 2,
						touchStart: function() {
							GameController.simulateKeyEvent( 'press', 40 );
							GameController.simulateKeyEvent( 'down', 40 );
						},
						touchEnd: function() {
							GameController.simulateKeyEvent( 'up', 40 );
						}
					},
					right: {
						width: '15%',
						height: '7%',
						stroke: 2,
						touchStart: function() {
							GameController.simulateKeyEvent( 'press', 39 );
							GameController.simulateKeyEvent( 'down', 39 );
						},
						touchEnd: function() {
							GameController.simulateKeyEvent( 'up', 39 );
						}
					}
				},
				joystick: {
					radius: 60,
					touchMove: function( e ) {
						console.log( e );
					}
				}
			},
			right: { 
				type: 'buttons', 
				position: { right: '17%', bottom: '28%' }, 
				buttons: [
					{ offset: { x: '-13%', y: 0 }, label: 'X', radius: '7%', stroke: 2, backgroundColor: 'blue', fontColor: '#fff', touchStart: function() {
						// Blue is currently mapped to up button
						GameController.simulateKeyEvent( 'press', 38 );
						GameController.simulateKeyEvent( 'down', 38 );
					}, touchEnd: function() {
						GameController.simulateKeyEvent( 'up', 38 );	
					} },
					{ offset: { x: 0, y: '-11%' }, label: 'Y', radius: '7%', stroke: 2, backgroundColor: 'yellow', fontColor: '#fff' },
					{ offset: { x: '13%', y: 0 }, label: 'B', radius: '7%', stroke: 2, backgroundColor: 'red', fontColor: '#fff', touchStart: function() {
						// Red is currently mapped to down button, and space button
						GameController.simulateKeyEvent( 'press', 32 );
						GameController.simulateKeyEvent( 'down', 32 );
	
						GameController.simulateKeyEvent( 'press', 40 );
						GameController.simulateKeyEvent( 'down', 40 );
					}, touchEnd: function() {
						GameController.simulateKeyEvent( 'up', 32 );						
						GameController.simulateKeyEvent( 'up', 40 );
					} },
					{ offset: { x: 0, y: '11%' }, label: 'A', radius: '7%', stroke: 2, backgroundColor: 'green', fontColor: '#fff', touchStart: function() {
						// Green is currently mapped to up button
						GameController.simulateKeyEvent( 'press', 38 );
						GameController.simulateKeyEvent( 'down', 38 );
					}, touchEnd: function() {
						GameController.simulateKeyEvent( 'up', 38 );	
					}  }
				],
				dpad: {
					up: {
						width: '7%',
						height: '15%',
						stroke: 2
					},
					left: {
						width: '15%',
						height: '7%',
						stroke: 2
					},
					down: {
						width: '7%',
						height: '15%',
						stroke: 2
					},
					right: {
						width: '15%',
						height: '7%',
						stroke: 2
					}
				},
				joystick: {
					radius: 60,
					touchMove: function( e ) {
						console.log( e );
					}
				}
			},
			touchRadius: 45
		},
		
		// Areas (objects) on the screen that can be touched
		touchableAreas: [],
		
		// Multi-touch
		touches: [],
		
		// Heavy sprites (with gradients) are cached as a canvas to improve performance
		cachedSprites: {},
		
		paused: false,
		
		init: function( options ) {
			
			// Don't do anything if there's no touch support
			if( ! 'ontouchstart' in document.documentElement )
				return;
				
	
			// Merge default options and specified options
			options = options || {};
			extend( this.options, options );	
			
			// Grab the canvas if one wasn't passed
			var ele;
			if( !this.options.canvas || !( ele = document.getElementById( this.options.canvas ) ) )
			{
				this.options.canvas = document.getElementsByTagName( 'canvas' )[0];
			}
			else if( ele )
			{
				this.options.canvas = ele;
			}
			
			this.options.ctx = this.options.canvas.getContext( '2d' );
			
			// Create a canvas that goes directly on top of the game canvas
			this.createOverlayCanvas();
		},
		
		/**
		 * Creates the canvas that sits on top of the game's canvas and holds game controls 
		 */
		createOverlayCanvas: function() {
			this.canvas = document.createElement( 'canvas' );
			
			// Scale to same size as original canvas
			this.resize( true );
			
			document.getElementsByTagName( 'body' )[0].appendChild( this.canvas );
			this.ctx = this.canvas.getContext( '2d' );
			
			var _this = this;
			window.addEventListener( 'resize', function() {
				// Wait for any other events to finish
				setTimeout( function() { GameController.resize.call( _this ); }, 1 );
			} );
			
			
			// Set the touch events for this new canvas
			this.setTouchEvents();
			
			// Load in the initial UI elements
			this.loadSide( 'left' );
			this.loadSide( 'right' );
			
			// Starts up the rendering / drawing
			this.render();
			
			if( ! this.touches || this.touches.length == 0 )
				this.paused = true; // pause until a touch event
		},
		
		pixelRatio: 1,
		resize: function( firstTime ) {
			// Scale to same size as original canvas
			this.canvas.width = this.options.canvas.width;
			this.canvas.height = this.options.canvas.height;
			
			// Get in on this retina action
			if( this.options.canvas.style.width && this.options.canvas.style.height && this.options.canvas.style.height.indexOf( 'px' ) !== -1 ) 
			{
				this.canvas.style.width = this.options.canvas.style.width;
				this.canvas.style.height = this.options.canvas.style.height;
				this.pixelRatio = this.canvas.width / parseInt( this.canvas.style.width );
			}
			
			this.canvas.style.position = 'absolute';
			this.canvas.style.left = this.options.canvas.offsetLeft + 'px';
			this.canvas.style.top = this.options.canvas.offsetTop + 'px';
			this.canvas.setAttribute( 'style', this.canvas.getAttribute( 'style' ) +' -ms-touch-action: none;' );
			
			if( !firstTime )
			{
				// Remove all current buttons
				this.touchableAreas = [];
				// Clear out the cached sprites
				this.cachedSprites = [];
				// Reload in the initial UI elements
				this.reloadSide( 'left' );
				this.reloadSide( 'right' );
			}
		},
		
		/**
		 * Returns the scaled pixels. Given the value passed
		 * @param {int/string} value - either an integer for # of pixels, or 'x%' for relative
		 * @param {char} axis - x, y
		 */
		getPixels: function( value, axis )
		{
			if( typeof value === 'undefined' )
				return 0
			else if( typeof value === 'number' )
				return value;
			else // a percentage
			{
				if( axis == 'x' )
					return ( parseInt( value ) / 100 ) * this.canvas.width;
				else
					return ( parseInt( value ) / 100 ) * this.canvas.height;
			}
		},
		
		/**
		 * Simulates a key press
		 * @param {string} eventName - 'down', 'up'
		 * @param {char} character
		 */
		simulateKeyEvent: function( eventName, keyCode ) {
			if( typeof window.onkeydown === 'undefined' ) // No keyboard, can't simulate...
				return false;
				
			/* If they have jQuery, use it because it works better for mobile safari */
			if( jQuery )
			{
				var press = jQuery.Event( 'key' + eventName );
				press.ctrlKey = false;
				press.which = keyCode;
				$( document ).trigger( press );
				return;
			}
	
			var oEvent = document.createEvent( 'KeyboardEvent' );
			
			// Chromium Hack
			if( navigator.userAgent.toLowerCase().indexOf('chrome') !== -1 )
			{
				Object.defineProperty( oEvent, 'keyCode', {
					get : function() {
						return this.keyCodeVal;
					}
				} );	 
				Object.defineProperty( oEvent, 'which', {
					get : function() {
						return this.keyCodeVal;
					}
				} );
			}
				
			if( oEvent.initKeyboardEvent )
			{
				oEvent.initKeyboardEvent( 'key' + eventName, true, true, document.defaultView, false, false, false, false, keyCode, keyCode );
			}
			else
			{
				oEvent.initKeyEvent( 'key' + eventName, true, true, document.defaultView, false, false, false, false, keyCode, keyCode );
			}
		
			oEvent.keyCodeVal = keyCode;
		
		},
		
		setTouchEvents: function() {
			var _this = this;
			var touchStart = function( e ) {
				if( _this.paused )
				{
					_this.paused = false;
				}
					
				e.preventDefault();
	
				// Microsoft always has to have their own stuff...
				if( window.navigator.msPointerEnabled && e.clientX && e.pointerType == e.MSPOINTER_TYPE_TOUCH )
				{
					_this.touches[ e.pointerId ] = { clientX: e.clientX, clientY: e.clientY };
				}
				else
				{
					_this.touches = e.touches || [];
				}
			};
	
			this.canvas.addEventListener( 'touchstart', touchStart, false );
			
			var touchEnd = function( e ) {			
				e.preventDefault();
			
				if( window.navigator.msPointerEnabled && e.pointerType == e.MSPOINTER_TYPE_TOUCH )
				{
					delete _this.touches[ e.pointerId ];
				}
				else
				{	
					_this.touches = e.touches || [];
				}
				
				if( !e.touches || e.touches.length == 0 )
				{
					// Draw once more to remove the touch area
					_this.render();
					_this.paused = true;
				}
			};
			this.canvas.addEventListener( 'touchend', touchEnd );
	
			var touchMove = function( e ) {
				e.preventDefault();
				
				if( window.navigator.msPointerEnabled && e.clientX && e.pointerType == e.MSPOINTER_TYPE_TOUCH )
				{
					_this.touches[ e.pointerId ] = { clientX: e.clientX, clientY: e.clientY };				
				}
				else
				{
					_this.touches = e.touches || [];
				}
			};
			this.canvas.addEventListener( 'touchmove', touchMove );
			
			if( window.navigator.msPointerEnabled )
			{
				this.canvas.addEventListener( 'MSPointerDown', touchStart );
				this.canvas.addEventListener( 'MSPointerUp', touchEnd );
				this.canvas.addEventListener( 'MSPointerMove', touchMove );
			}
		},
		
		/**
		 * Adds the area to a list of touchable areas, draws
		 * @param {object} options with properties: x, y, width, height, touchStart, touchEnd, touchMove
		 */
		addTouchableDirection: function( options ) {
			
			var direction = new TouchableDirection( options );
			
			direction.id = this.touchableAreas.push( direction );
		},
		
		/**
		 * Adds the circular area to a list of touchable areas, draws	
		 * @param {object} options with properties: x, y, width, height, touchStart, touchEnd, touchMove
		 */
		addJoystick: function( options ) { //x, y, radius, backgroundColor, touchStart, touchEnd ) {
			
			var joystick = new TouchableJoystick( options );
			
			joystick.id = this.touchableAreas.push( joystick );
			
		},
		
		/**
		 * Adds the circular area to a list of touchable areas, draws	 
		 * @param {object} options with properties: x, y, width, height, touchStart, touchEnd, touchMove
		 */
		addButton: function( options ) { //x, y, radius, backgroundColor, touchStart, touchEnd ) {
			
			var button = new TouchableButton( options );
			
			button.id = this.touchableAreas.push( button );
		},
		
		addTouchableArea: function( check, callback ) {
		},
		
		loadButtons: function( side ) {
			var buttons = this.options[ side ].buttons;
			var _this = this;
			for( var i = 0, j = buttons.length; i < j; i++ )
			{
				var posX = this.getPositionX( side );
				var posY = this.getPositionY( side );
							
				buttons[i].x = posX + this.getPixels( buttons[i].offset.x, 'y' );
				buttons[i].y = posY + this.getPixels( buttons[i].offset.y, 'y' );
	
				this.addButton( buttons[i] );
			}
		},
		
		loadDPad: function( side ) {
			var dpad = this.options[ side ].dpad || {};
			
			// Centered value is at this.options[ side ].position
			
			var _this = this;
			
			var posX = this.getPositionX( side );
			var posY = this.getPositionY( side );
			
			
			// If they have all 4 directions, add a circle to the center for looks
			if( dpad.up && dpad.left && dpad.down && dpad.right )
			{
				var options = {
					x: posX,
					y: posY,
					radius: dpad.right.height
				}
				var center = new TouchableCircle( options ); 
				this.touchableAreas.push( center );
			}
	
			// Up arrow
			if( dpad.up !== false )
			{
				dpad.up.x = posX - this.getPixels( dpad.up.width, 'y' ) / 2;
				dpad.up.y = posY - ( this.getPixels( dpad.up.height, 'y' ) +  this.getPixels( dpad.left.height, 'y' ) / 2 );
				dpad.up.direction = 'up';
				this.addTouchableDirection( dpad.up );
			}
	
			// Left arrow
			if( dpad.left !== false )
			{
				dpad.left.x = posX - ( this.getPixels( dpad.left.width, 'y' ) + this.getPixels( dpad.up.width, 'y' ) / 2 );
				dpad.left.y = posY - ( this.getPixels( dpad.left.height, 'y' ) / 2 );
				dpad.left.direction = 'left';
				this.addTouchableDirection( dpad.left );
			}
	
			// Down arrow
			if( dpad.down !== false )
			{
				dpad.down.x = posX - this.getPixels( dpad.down.width, 'y' ) / 2;
				dpad.down.y = posY + ( this.getPixels( dpad.left.height, 'y' ) / 2 );
				dpad.down.direction = 'down';
				this.addTouchableDirection( dpad.down );
			}
			
			// Right arrow
			if( dpad.right !== false )
			{
				dpad.right.x = posX + ( this.getPixels( dpad.up.width, 'y' ) / 2 );
				dpad.right.y = posY - this.getPixels( dpad.right.height, 'y' ) / 2;
				dpad.right.direction = 'right';
				this.addTouchableDirection( dpad.right );
			}
			
		},
		
		loadJoystick: function( side ) {
			var joystick = this.options[ side ].joystick;
			joystick.x = this.getPositionX( side );
			joystick.y = this.getPositionY( side );
	
			this.addJoystick( joystick );
		},
		
		/**
		 * Used for resizing. Currently is just an alias for loadSide
		 */
		reloadSide: function( side ) {
			// Load in new ones
			this.loadSide( side );
		},
		
		loadSide: function( side ) {
			if( this.options[ side ].type === 'dpad' )
			{
				this.loadDPad( side );
			}
			else if( this.options[ side ].type === 'joystick' )
			{
				this.loadJoystick( side );
			}
			else if( this.options[ side ].type === 'buttons' )
			{
				this.loadButtons( side );
			}
		},
		
		/**
		 * Normalize touch positions by the left and top offsets
		 * @param {int} x
		 */
		normalizeTouchPositionX: function( x )
		{
			return ( x - GameController.options.canvas.offsetLeft + document.body.scrollLeft ) * ( this.pixelRatio );
		},
		
		/**
		 * Normalize touch positions by the left and top offsets
		 * @param {int} y
		 */
		normalizeTouchPositionY: function( y )
		{
			return ( y - GameController.options.canvas.offsetTop + document.body.scrollTop ) * ( this.pixelRatio );
		},
		
		/**
		 * Returns the x position when given # of pixels from right (based on canvas size)
		 * @param {int} right 
		 */
		getXFromRight: function( right ) {
			return this.canvas.width - right;
		},
		
		
		/**
		 * Returns the y position when given # of pixels from bottom (based on canvas size)
		 * @param {int} right 
		 */
		getYFromBottom: function( bottom ) {
			return this.canvas.height - bottom;
		},
		
		/**
		 * Grabs the x position of either the left or right side/controls
		 * @param {string} side - 'left', 'right' 
		 */
		getPositionX: function( side ) {
			if( typeof this.options[ side ].position.left !== 'undefined' )
				return this.getPixels( this.options[ side ].position.left, 'x' );
			else
				return this.getXFromRight( this.getPixels( this.options[ side ].position.right, 'x' ) );
		},
		
		/**
		 * Grabs the y position of either the left or right side/controls
		 * @param {string} side - 'left', 'right' 
		 */
		getPositionY: function( side ) {
			if( typeof this.options[ side ].position.top !== 'undefined' )
				return this.getPixels( this.options[ side ].position.top, 'y' );
			else
				return this.getYFromBottom( this.getPixels( this.options[ side ].position.bottom, 'y' ) );
		},
		
		render: function() {
	
			this.ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
				
			// When no touch events are happening, this enables 'paused' mode, which only skips this small part.
			// Skipping the clearRect and draw()s would be nice, but it messes with the transparent gradients
			if( ! this.paused )
			{
				var cacheId = 'touch-circle';
				var cached = GameController.cachedSprites[ cacheId ];
				if( ! cached && this.options.touchRadius )
				{
					var subCanvas = document.createElement( 'canvas' );
					var ctx = subCanvas.getContext( '2d' );
					subCanvas.width = 2 * this.options.touchRadius;
					subCanvas.height = 2 * this.options.touchRadius;
		
					var center = this.options.touchRadius;
					var gradient = ctx.createRadialGradient( center, center, 1, center, center, this.options.touchRadius ); // 10 = end radius
					gradient.addColorStop( 0, 'rgba( 200, 200, 200, 1 )' );
					gradient.addColorStop( 1, 'rgba( 200, 200, 200, 0 )' );
					ctx.beginPath();
					ctx.fillStyle = gradient;
					ctx.arc( center, center, this.options.touchRadius, 0 , 2 * Math.PI, false );
					ctx.fill();
				
					cached = GameController.cachedSprites[ cacheId ] = subCanvas;
				}
				
				// Draw the current touch positions if any
				for( var i = 0, j = this.touches.length; i < j; i++ )
				{
					var touch = this.touches[ i ];
					if( typeof touch === 'undefined' )
						continue;
					var x = this.normalizeTouchPositionX( touch.clientX ), y = this.normalizeTouchPositionY( touch.clientY );
					this.ctx.drawImage( cached, x - this.options.touchRadius, y - this.options.touchRadius );
				}
			}
			
			for( var i = 0, j = this.touchableAreas.length; i < j; i++ )
			{	
				this.touchableAreas[ i ].draw();
				
				var area = this.touchableAreas[ i ];
					
				// Go through all touches to see if any hit this area
				var touched = false;
				for( var k = 0, l = this.touches.length; k < l; k++ )
				{
					var touch = this.touches[ k ];
					if( typeof touch === 'undefined' )
						continue;
	
					var x = this.normalizeTouchPositionX( touch.clientX ), y = this.normalizeTouchPositionY( touch.clientY );
													
					// Check that it's in the bounding box/circle
					if( ( area.check( x, y ) ) !== false )
					{
						if( !touched )
							touched = this.touches[ k ];
					}
				}
				if( touched )
				{
					if( !area.active )
						area.touchStartWrapper( touched );
					area.touchMoveWrapper( touched );
				}
				else if( area.active )
				{
					area.touchEndWrapper( touched );
				}
			}
			
			window.requestAnimationFrame( this.renderWrapper );
		},
		/**
		 * So we can keep scope, and don't have to create a new obj every requestAnimationFrame (bad for garbage collection) 
		 */
		renderWrapper: function() {
			GameController.render();
		}
		
	}
	
	/**
	 * Superclass for touchable stuff 
	 */
	var TouchableArea = ( function() {
		
		function TouchableArea() 
		{
		}
		
		// Called when this direction is being touched
		TouchableArea.prototype.touchStart = null;
		
		// Called when this direction is being moved
		TouchableArea.prototype.touchMove = null;
		
		// Called when this direction is no longer being touched
		TouchableArea.prototype.touchEnd = null;
		
		TouchableArea.prototype.type = 'area';
		TouchableArea.prototype.id = false;
		TouchableArea.prototype.active = false;
		
		/**
		 * Sets the user-specified callback for this direction being touched
		 * @param {function} callback 
		 */
		TouchableArea.prototype.setTouchStart = function( callback ) {
			this.touchStart = callback;
		};
		
		/**
		 * Called when this direction is no longer touched 
		 */
		TouchableArea.prototype.touchStartWrapper = function( e ) {
			// Fire the user specified callback
			if( this.touchStart )
				this.touchStart();
			
			// Mark this direction as active
			this.active = true;
		};
		
		/**
		 * Sets the user-specified callback for this direction no longer being touched
		 * @param {function} callback 
		 */
		TouchableArea.prototype.setTouchMove = function( callback ) {
			this.touchMove = callback;
		};
		
		/**
		 * Called when this direction is moved. Make sure it's actually changed before passing to developer
		 */
		TouchableArea.prototype.lastPosX = 0;
		TouchableArea.prototype.lastPosY = 0;
		TouchableArea.prototype.touchMoveWrapper = function( e ) {
			// Fire the user specified callback
			if( this.touchMove && ( e.clientX != TouchableArea.prototype.lastPosX || e.clientY != TouchableArea.prototype.lastPosY ) )
			{
				this.touchMove();
				this.lastPosX = e.clientX;
				this.lastPosY = e.clientY;
			}
			// Mark this direction as inactive
			this.active = true;
		};
		
		/**
		 * Sets the user-specified callback for this direction no longer being touched
		 * @param {function} callback 
		 */
		TouchableArea.prototype.setTouchEnd = function( callback ) {
			this.touchEnd = callback;
		};
		
		/**
		 * Called when this direction is first touched 
		 */
		TouchableArea.prototype.touchEndWrapper = function( e ) {
			// Fire the user specified callback
			if( this.touchEnd )
				this.touchEnd();
			
			// Mark this direction as inactive
			this.active = false;
			
			GameController.render();
		};
		
		return TouchableArea;
		
	} )();
	
	var TouchableDirection = ( function( __super ) {
		__extends( TouchableDirection, __super );
		
		function TouchableDirection( options ) 
		{
			for( var i in options )
			{
				if( i == 'x' )
					this[i] = GameController.getPixels( options[i], 'x' );
				else if( i == 'y' || i == 'height' || i == 'width' )
					this[i] = GameController.getPixels( options[i], 'y' );
				else
					this[i] = options[i];
			}
			
			this.draw();
		}
	
		TouchableDirection.prototype.type = 'direction';
		
		/**
		 * Checks if the touch is within the bounds of this direction 
		 */
		TouchableDirection.prototype.check = function( touchX, touchY ) {
			var distanceX, distanceY;
			if( ( Math.abs( touchX - this.x ) < ( GameController.options.touchRadius / 2 ) || ( touchX > this.x ) ) && // left
				( Math.abs( touchX - ( this.x + this.width ) ) < ( GameController.options.touchRadius / 2 ) || ( touchX < this.x + this.width ) ) && // right
				( Math.abs( touchY - this.y ) < ( GameController.options.touchRadius / 2 ) || ( touchY > this.y ) ) && // top
				( Math.abs( touchY - ( this.y + this.height ) ) < ( GameController.options.touchRadius / 2 ) || ( touchY < this.y + this.height ) ) // bottom
			)
				return true;
				
			return false;
		};
		
		TouchableDirection.prototype.draw = function() {
			var cacheId = this.type + '' + this.id + '' + this.active;
			var cached = GameController.cachedSprites[ cacheId ];
			if( ! cached )
			{
				var subCanvas = document.createElement( 'canvas' );
				var ctx = subCanvas.getContext( '2d' );
				subCanvas.width = this.width + 2 * this.stroke;
				subCanvas.height = this.height + 2 * this.stroke;
	
				var opacity = this.opacity || 0.9;
				
				if( ! this.active ) // Direction currently being touched
					opacity *= 0.5;
					
				switch( this.direction )
				{
					case 'up':
						var gradient = ctx.createLinearGradient( 0, 0, 0, this.height );
						gradient.addColorStop( 0, 'rgba( 0, 0, 0, ' + ( opacity * 0.5 ) + ' )' );
						gradient.addColorStop( 1, 'rgba( 0, 0, 0, ' + opacity + ' )' );   
						break;
					case 'left':
						var gradient = ctx.createLinearGradient( 0, 0, this.width, 0 );
						gradient.addColorStop( 0, 'rgba( 0, 0, 0, ' + ( opacity * 0.5 ) + ' )' );
						gradient.addColorStop( 1, 'rgba( 0, 0, 0, ' + opacity + ' )' );   
						break;
					case 'right':
						var gradient = ctx.createLinearGradient( 0, 0, this.width, 0 );
						gradient.addColorStop( 0, 'rgba( 0, 0, 0, ' + opacity + ' )' );
						gradient.addColorStop( 1, 'rgba( 0, 0, 0, ' + ( opacity * 0.5 ) + ' )' );  
						break;
					case 'down':
					default:
						var gradient = ctx.createLinearGradient( 0, 0, 0, this.height );
						gradient.addColorStop( 0, 'rgba( 0, 0, 0, ' + opacity + ' )' );
						gradient.addColorStop( 1, 'rgba( 0, 0, 0, ' + ( opacity * 0.5 ) + ' )' );   
				}
				ctx.fillStyle = gradient;
		
				ctx.fillRect( 0, 0, this.width, this.height );
				ctx.lineWidth = this.stroke;
				ctx.strokeStyle = 'rgba( 255, 255, 255, 0.1 )';
				ctx.strokeRect( 0, 0, this.width, this.height );
				
				cached = GameController.cachedSprites[ cacheId ] = subCanvas;
			}
			
			GameController.ctx.drawImage( cached, this.x, this.y );
				
	
		};
		
		return TouchableDirection;
	} )( TouchableArea );
	
	var TouchableButton = ( function( __super ) {
		__extends( TouchableButton, __super );
		
		function TouchableButton( options ) //x, y, radius, backgroundColor )
		{
			for( var i in options )
			{
				if( i == 'x' )
					this[i] = GameController.getPixels( options[i], 'x' );
				else if( i == 'x' || i == 'radius' )
					this[i] = GameController.getPixels( options[i], 'y' );
				else
					this[i] = options[i];
			}
			
			this.draw();
		}
		
		TouchableButton.prototype.type = 'button';
		
		/**
		 * Checks if the touch is within the bounds of this direction 
		 */
		TouchableButton.prototype.check = function( touchX, touchY ) {
			if( 
				( Math.abs( touchX - this.x ) < this.radius + ( GameController.options.touchRadius / 2 ) ) &&
				( Math.abs( touchY - this.y ) < this.radius + ( GameController.options.touchRadius / 2 ) )
			)
				return true;
				
			return false;
		};
		
		TouchableButton.prototype.draw = function() {
			var cacheId = this.type + '' + this.id + '' + this.active;
			var cached = GameController.cachedSprites[ cacheId ];
			if( ! cached )
			{
				var subCanvas = document.createElement( 'canvas' );
				var ctx = subCanvas.getContext( '2d' );
				ctx.lineWidth = this.stroke;
				subCanvas.width = subCanvas.height = 2 * ( this.radius + ctx.lineWidth );
				
				
				var gradient = ctx.createRadialGradient( this.radius, this.radius, 1, this.radius, this.radius, this.radius );
				var textShadowColor;
				switch( this.backgroundColor )
				{
					case 'blue':
						gradient.addColorStop( 0, 'rgba(123, 181, 197, 0.6)' );
						gradient.addColorStop( 1, '#105a78' );
						textShadowColor = '#0A4861';
						break;
					case 'green':
						gradient.addColorStop( 0, 'rgba(29, 201, 36, 0.6)' );
						gradient.addColorStop( 1, '#107814' );
						textShadowColor = '#085C0B';
						break;
					case 'red':
						gradient.addColorStop( 0, 'rgba(165, 34, 34, 0.6)' );
						gradient.addColorStop( 1, '#520101' );
						textShadowColor = '#330000';
						break;
					case 'yellow':
						gradient.addColorStop( 0, 'rgba(219, 217, 59, 0.6)' );
						gradient.addColorStop( 1, '#E8E10E' );
						textShadowColor = '#BDB600';
						break;
					case 'white':
					default:
						gradient.addColorStop( 0, 'rgba( 255,255,255,.3 )' );
						gradient.addColorStop( 1, '#eee' );
						break;
				}
					
				if( this.active )			
					ctx.fillStyle = textShadowColor;
				else	
					ctx.fillStyle = gradient;
	
				ctx.strokeStyle = textShadowColor;			
		
				ctx.beginPath();
				//ctx.arc( this.x, this.y, this.radius, 0 , 2 * Math.PI, false );
				ctx.arc( subCanvas.width / 2, subCanvas.width / 2, this.radius, 0 , 2 * Math.PI, false );
				ctx.fill();
				ctx.stroke();
				
				if( this.label )
				{
					// Text Shadow
					ctx.fillStyle = textShadowColor;
					ctx.font = 'bold ' + ( this.fontSize || subCanvas.height * 0.35 ) + 'px Verdana';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText( this.label, subCanvas.height / 2 + 2, subCanvas.height / 2 + 2 );
		
		
					ctx.fillStyle = this.fontColor;
					ctx.font = 'bold ' + ( this.fontSize || subCanvas.height * 0.35 ) + 'px Verdana';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText( this.label, subCanvas.height / 2, subCanvas.height / 2 );
				}
				
				cached = GameController.cachedSprites[ cacheId ] = subCanvas;
			}
			
			GameController.ctx.drawImage( cached, this.x, this.y );
			
			
		};
		
		return TouchableButton;
	} )( TouchableArea );
	
	var TouchableJoystick = ( function( __super ) {
		__extends( TouchableJoystick, __super );
		
		function TouchableJoystick( options ) //x, y, radius, backgroundColor )
		{
			for( var i in options )
				this[i] = options[i];
				
			this.currentX = this.currentX || this.x;
			this.currentY = this.currentY || this.y;
		}
		
		TouchableJoystick.prototype.type = 'joystick';
		
		/**
		 * Checks if the touch is within the bounds of this direction 
		 */
		TouchableJoystick.prototype.check = function( touchX, touchY ) {
			if( 
				( Math.abs( touchX - this.x ) < this.radius + ( GameController.options.touchRadius / 2 ) ) &&
				( Math.abs( touchY - this.y ) < this.radius + ( GameController.options.touchRadius / 2 ) )
			)
				return true;
				
			return false;
		};
		
		/**
		 * details for the joystick move event, stored here so we're not constantly creating new objs for garbage. The object has params:
		 * dx - the number of pixels the current joystick center is from the base center in x direction
		 * dy - the number of pixels the current joystick center is from the base center in y direction
		 * max - the maximum number of pixels dx or dy can be
		 * normalizedX - a number between -1 and 1 relating to how far left or right the joystick is
		 * normalizedY - a number between -1 and 1 relating to how far up or down the joystick is
		 */
		TouchableJoystick.prototype.moveDetails = {};
		
		/**
		 * Called when this joystick is moved
		 */
		TouchableJoystick.prototype.touchMoveWrapper = function( e ) {
			this.currentX = GameController.normalizeTouchPositionX( e.clientX );	
			this.currentY = GameController.normalizeTouchPositionY( e.clientY );
			
			// Fire the user specified callback
			if( this.touchMove )
			{
				if( this.moveDetails.dx != this.currentX - this.x && this.moveDetails.dy != this.y - this.currentY )
				{
					this.moveDetails.dx = this.currentX - this.x; // reverse so right is positive
					this.moveDetails.dy = this.y - this.currentY;
					this.moveDetails.max = this.radius + ( GameController.options.touchRadius / 2 );
					this.moveDetails.normalizedX = this.moveDetails.dx / this.moveDetails.max;
					this.moveDetails.normalizedY = this.moveDetails.dy / this.moveDetails.max;
						
					this.touchMove( this.moveDetails );
				}
			}
				
			
			// Mark this direction as inactive
			this.active = true;
		};
		
		TouchableJoystick.prototype.draw = function() {
			if( ! this.id ) // wait until id is set
				return false;
				
			var cacheId = this.type + '' + this.id + '' + this.active;
			var cached = GameController.cachedSprites[ cacheId ];
			if( ! cached )
			{
				var subCanvas = document.createElement( 'canvas' );
				this.stroke = this.stroke || 2;
				subCanvas.width = subCanvas.height = 2 * ( this.radius + this.stroke );
				
				var ctx = subCanvas.getContext( '2d' );
				ctx.lineWidth = this.stroke;
				if( this.active ) // Direction currently being touched
				{
					var gradient = ctx.createRadialGradient( 0, 0, 1, 0, 0, this.radius );
					gradient.addColorStop( 0, 'rgba( 200,200,200,.5 )' );
					gradient.addColorStop( 1, 'rgba( 200,200,200,.9 )' );
					ctx.strokeStyle = '#000';
				}	
				else
				{
					// STYLING FOR BUTTONS
					var gradient = ctx.createRadialGradient( 0, 0, 1, 0, 0, this.radius );
					gradient.addColorStop( 0, 'rgba( 200,200,200,.2 )' );
					gradient.addColorStop( 1, 'rgba( 200,200,200,.4 )' );
					ctx.strokeStyle = 'rgba( 0,0,0,.4 )';
				}
				ctx.fillStyle = gradient;
				// Actual joystick part that is being moved
				ctx.beginPath();
				ctx.arc( this.radius, this.radius, this.radius, 0 , 2 * Math.PI, false );
				ctx.fill();
				ctx.stroke();
				
				cached = GameController.cachedSprites[ cacheId ] = subCanvas;
			}
			
			// Draw the base that stays static
			GameController.ctx.fillStyle = '#444';
			GameController.ctx.beginPath();
			GameController.ctx.arc( this.x, this.y, this.radius * 0.7, 0 , 2 * Math.PI, false );
			GameController.ctx.fill();
			GameController.ctx.stroke();
			
			GameController.ctx.drawImage( cached, this.currentX - this.radius, this.currentY - this.radius );
			
			
		};
		
		return TouchableJoystick;
	} )( TouchableArea );
	
	
	var TouchableCircle = ( function( __super ) {
		__extends( TouchableCircle, __super );
		
		function TouchableCircle( options )
		{
			for( var i in options )
			{
				if( i == 'x' )
					this[i] = GameController.getPixels( options[i], 'x' );
				else if( i == 'x' || i == 'radius' )
					this[i] = GameController.getPixels( options[i], 'y' );
				else
					this[i] = options[i];
			}
	
			this.draw();
		}
		
		/**
		 * No touch for this fella 
		 */
		TouchableCircle.prototype.check = function( touchX, touchY ) {
			return false;
		};
		
		TouchableCircle.prototype.draw = function() {
	
			// STYLING FOR BUTTONS
			GameController.ctx.fillStyle = 'rgba( 0, 0, 0, 0.5 )';
			
			// Actual joystick part that is being moved
			GameController.ctx.beginPath();
			GameController.ctx.arc( this.x, this.y, this.radius, 0 , 2 * Math.PI, false );
			GameController.ctx.fill();
	
		};
		
		return TouchableCircle;
	} )( TouchableArea );
	
	/**
	 * Shim for requestAnimationFrame 
	 */
	( function() {
	  if (typeof module !== "undefined") return
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for( var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x )
		{
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
										 || window[vendors[x]+'CancelRequestAnimationFrame'];
		}
	 
		if ( !window.requestAnimationFrame )
			window.requestAnimationFrame = function( callback, element ) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max( 0, 16 - ( currTime - lastTime ) );
				var id = window.setTimeout( function() { callback(currTime + timeToCall); }, 
					timeToCall );
				lastTime = currTime + timeToCall;
				return id;
			};
	 
		if ( !window.cancelAnimationFrame )
			window.cancelAnimationFrame = function( id ) {
				clearTimeout( id );
			};
	}() );
} )(typeof module !== "undefined" ? module.exports : window)
},{}],12:[function(require,module,exports){

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