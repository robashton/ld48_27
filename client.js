var domReady = require('domready')
  , canvas = require('./game/canvas')
  , rect = require('./game/rect')
  , physics = require('./game/physics')
  , core = require('./game/core')
  , input = require('./game/input')
  , balancing = require('./game/balancing')
  , text = require('./game/text')

domReady(function() {
  input.init()

  var player = rect.create(canvas.halfwidth(), canvas.halfheight(), 3, 3)
    , enemies = null
    , bullets = core.repeat(1000, createBullet)
    , timeLeft = -1
    , frameTime  = 1000 / 30
    , score = 0
    , health = 100
    , collisions = null

  setInterval(function() {
    if(timeLeft < 0) {
      timeLeft = 10000
      balancing.levelup()
      enemies = core.repeat(100, spawnEnemy)
      health = 100
    }

    // If you're looking at this and wondering WTF, then
    // basically, I decide to have a bit of fun with this and see about 
    // avoiding creating new objects, and avoid mutation unless the function returns
    // the new version of the object
    // It has worked out in some places, and not in others
    // A fun experiment it was nonetheless
    player = physics.apply(player)
    player = input.applyImpulses(player)
    bullets = input.applyBullets(bullets, player)
    enemies = core.updatein(enemies, physics.apply)
    bullets = core.updatein(bullets, physics.apply)
    enemies = core.updatein(enemies, rect.gravitateTowards, player, balancing.enemyImpulse()) 
    collisions = physics.collideLists(enemies, bullets)
    score = updateScoreFromCollisions(score, collisions)
    enemies = rect.killUsing(enemies, collisions, firstItemFromCollision)
    bullets = rect.killUsing(bullets, collisions, secondItemFromCollision)
    collisions = physics.collideWithList(player, enemies)
    health = updateHealthFromCollisions(health, collisions)
    enemies = rect.killUsing(enemies, collisions, firstItemFromCollision)
    timeLeft -= frameTime

    clear()
    rect.draw(player)
    core.each(enemies, function(enemy) { rect.draw(enemy) })
    core.each(bullets, function(bullet) { rect.draw(bullet) })
    text.draw('Time left: ' + parseInt(timeLeft / 1000, 10), 500, 20, 18)
    text.draw('Score: ' + score, 10, 20, 18)
    text.draw('Health: ' + health, 10, 480, 18)
  }, frameTime)
})


function firstItemFromCollision(item) {
  return item.collision ? item.one : null
}

function secondItemFromCollision(item) {
  return item.collision ? item.two : null
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
