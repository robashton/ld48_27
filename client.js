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
    var collisions = physics.collideLists(enemies, bullets)
    enemies = rect.killUsing(enemies, collisions, function(item) { return item.collision ? item.one : null})
    bullets = rect.killUsing(bullets, collisions, function(item) { return item.collision ? item.two : null})
    rect.draw(player)
    core.each(enemies, function(enemy) { rect.draw(enemy) })
    core.each(bullets, function(bullet) { rect.draw(bullet) })
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
