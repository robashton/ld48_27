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
  , Sound = require('primo-audio')

domReady(function() {
  var btnStart = document.getElementById('start')
    , btnRestart = document.getElementById('restart')
    , introContainer = document.getElementById('intro')
    , playContainer = document.getElementById('play')
    , overContainer = document.getElementById('over')
    , scoreContainer = document.getElementById('score')
    , started = false
    , beat = new Sound('bass')

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

    setTimeout(playBeat, 1000)

    function playBeat() {
      if(!player.alive) return
      if(timeLeft < 6000) {
        beat.play()
      }
      setTimeout(playBeat, (timeLeft / 10000) * 1000)
    }

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

      // It all fell over around about this point (okay, actually much earlier, hah)
      collisions = physics.collideWithList(player, powerups)
      core.each(collisions, function(item) {
        if(!item.collision) return false
        switch(powerups[item.one].type) {
          case 'health':
            health = Math.min(100, health + 20)
            break;
          case 'time':
            timeLeft = 10000
            break;
          case 'smartbomb':
            explosions = explosionsForAll(explosions, enemies)
            enemies = destroyAllEnemies(enemies)
            break;
        }
      })

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

function explosionsForAll(explosions, enemies) {
  core.each(enemies, function(enemy) {
    explosions = addExplosionParticleTo(explosions, enemy) 
  })
  return explosions
}

function destroyAllEnemies(enemies) {
  core.updatein(enemies, function(enemy) {
    enemy.alive = false
    return enemy
  })
  return enemies
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

    var index = Math.random() * 100

    if(index < 70) {
      powerups[i].type = 'time'
      powerups[i].render.image = 'time.png'
    }
    else if(index < 90) {
      powerups[i].type = 'health'
      powerups[i].render.image = 'heart.png'
    }
    else if(index < 100) {
      powerups[i].type = 'smartbomb'
      powerups[i].render.image = 'powerup.png'
    }

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

},{"./game/balancing":2,"./game/canvas":3,"./game/core":4,"./game/input":5,"./game/maths":6,"./game/physics":7,"./game/rect":8,"./game/text":9,"domready":10,"primo-audio":14}],2:[function(require,module,exports){
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
    if(fn.apply(this, fnArgs) === false) break
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


},{"./balancing":2,"./canvas":3,"./maths":6,"./rect":8,"throttleit":15}],6:[function(require,module,exports){
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
    type: '',
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
var _ = require('underscore')
var EventContainer = require('./eventcontainer');
  
var Eventable = function() {
  this.eventListeners = {};
  this.eventDepth = 0;
  this.proxies = []
};

Eventable.prototype = {
  autoHook: function(container) {
    for(var key in container) { 
      if(key.indexOf('on') === 0) {
        this.on(key.substr(2), container[key], container);
      }   
    }
  },
  autoUnhook: function(container) {
    for(var key in container) { 
      if(key.indexOf('on') === 0) {
        this.off(key.substr(2), container[key], container);
      }   
    }
  },
  clearListeners: function() {
    this.eventListeners = {};
    this.eventDepth = 0;
    this.proxies = []
  },
  once: function(eventName, callback, context) {
    var self = this;
    var wrappedCallback = function(data, sender) {
      callback.call(this, data, sender);
      self.off(eventName, wrappedCallback, context);
    };
    this.on(eventName, wrappedCallback, context);
  },
  
  on: function(eventName, callback, context) {
    this.eventContainerFor(eventName).add(callback, context);
  },
  
  off: function(eventName, callback, context) {
    this.eventContainerFor(eventName).remove(callback, context);
  },
  raise: function(eventName, data, sender) {
    var container = this.eventListeners[eventName];

    if(container)
      container.raise(sender || this, data);

    var proxies = this.proxies
    for(var i = 0 ; i < proxies.length ; i++)
      proxies[i].raise(eventName, data, sender || this)
  },
  addProxy: function(proxy) {
    this.proxies.push(proxy)
  },
  removeProxy: function(proxy) {
    this.proxies = _.without(this.proxies, proxy)
  },
  eventContainerFor: function(eventName) {
    var container = this.eventListeners[eventName];
    if(!container) {
      container =  new EventContainer(this);
      this.eventListeners[eventName] = container;
    }
    return container;
  }
};

module.exports = Eventable;


},{"./eventcontainer":12,"underscore":13}],12:[function(require,module,exports){
var _ = require('underscore');

var EventContainer = function(defaultContext) {
  this.handlers = [];
  this.defaultContext = defaultContext;
}; 

EventContainer.prototype = {
  raise: function(source, data) {
   var handlerLength = this.handlers.length;
   var handlers = this.handlers
   for(var i = 0; i < handlerLength; i++) {
      var handler = handlers[i];
      handler.method.call(handler.context || this.defaultContext, data, source);   
   }
  },
  add: function(method, context) {
    this.handlers.push({
      method: method,
      context: context      
    });
  },
  remove: function(method, context) {
    this.handlers = _(this.handlers).filter(function(item) {
      return item.method !== method || item.context !== context;
    });
  }
};
  
module.exports = EventContainer;

},{"underscore":13}],13:[function(require,module,exports){
//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],14:[function(require,module,exports){
var _ = require('underscore')
  , Eventable = require('primo-events')

var Sound = function(path) {
  Eventable.call(this)

  Sound.initSystem()
  this.path = path
  this.loadedPath = ''
  this.rawdata = null
  if(!Sound.Enabled) return
  this.detectAudio()
}
Sound.prototype = {
  detectAudio: function() {
    var attempts = [ loadmp3, loadogg, loadaac, loadwav ]
    var self = this
    var success = function(rawdata) {
      self.rawdata = rawdata
      self.raise('loaded')
    }
    var tryNext = function() {
      if(attempts.length === 0) {
        console.warn('Unable to load audio for ', self.path)
        return
      }
      var fn = attempts.shift()
      fn(self.path, success, tryNext)
    }
    tryNext()
  },
  play: function() {
    if(!Sound.Enabled) return
    var audio = this.getAudio()
    audio.pause()
    audio.currentTime = 0
    try {
      audio.play()
    } catch (ex) {
      this.raise('error', ex)
    }
  },
  getAudio: function() {
    return this.rawdata
  }
}
_.extend(Sound.prototype, Eventable.prototype)

Sound.allowBase64 = false // Shouldn't be needed if I get everthing else right
Sound.initSystem = function() {
  if(this.initialized) return
  var a = document.createElement('audio')
  this.Enabled = !!a.canPlayType
  this.mp3 = !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''))
  this.ogg = !!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''))
  this.wav = !!(a.canPlayType && a.canPlayType('audio/wav; codecs="1"').replace(/no/, ''))
  this.aac = !!(a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ''))
}

function downloadFile(path, cb) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.onreadystatechange = function() {
    if(xmlHttp.readyState === 4) {
      cb(xmlHttp.responseText)
    }
  }
  xmlHttp.open( "GET", path, true )
  xmlHttp.send( null )
}



function handleAudioLoading(audio, cb) {

  var force = function () {
    audio.pause();
    audio.removeEventListener('play', force, false);
    if(cb) { cb(); cb = null; }
  };

  var progress = function () {
    audio.removeEventListener('play', force, false);
    audio.removeEventListener('progress', progress, false);
    if(cb) { cb(); cb = null; }
  };

  audio.addEventListener('play', force, false);
  audio.addEventListener('progress', progress, false);

  var click = document.ontouchstart === undefined ? 'click' : 'touchstart';
  var kickoff = function () {
    audio.play();
    document.documentElement.removeEventListener(click, kickoff, true);
  };

  document.documentElement.addEventListener(click, kickoff, true);
}

function tryBase64(mime, path, success, failure) {
  if(!Sound.allowBase64) return failure()
  downloadFile(path, function(data) {
    if(!data) return failure
    var audio = new Audio()
    audio.src = mime + ';base64,' + data
    handleAudioLoading(audio, function() {
      success(audio)
    })
  })
}

function tryAudio(path, success, failure) {
  var audio = new Audio()
  try { 
    audio.src = path
  } catch(ex) {
    return failure()
  }
  handleAudioLoading(audio, function() {
    success(audio)
  })
}

function loadmp3(path, success, failure) {
  if(!Sound.mp3) return failure()
  tryBase64('data:audio/mp3', path + '.mp3.base64', success, function() {
     tryAudio(path + '.mp3', success, failure)
   })
}

function loadogg(path, success, failure) {
  if(!Sound.ogg) return false
  tryBase64('data:audio/ogg', path + '.ogg.base64', success, function() {
    tryAudio(path + '.ogg', success, failure)
  })
}
function loadaac(path, success, failure) {
  if(!Sound.aac) return false
  tryBase64('data:audio/mp4', path + '.mp4.base64', success, function() {
     tryAudio(path + '.mp4', success, failure)
  })
}

function loadwav(path, success, failure) {
  if(!Sound.wav) return false
  tryBase64('data:audio/wav', path + '.wav.base64', success, function() {
   tryAudio(path + '.wav', success, failure)
  })
}

module.exports = Sound

},{"primo-events":11,"underscore":13}],15:[function(require,module,exports){

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