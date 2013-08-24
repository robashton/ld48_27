var domReady = require('domready')
  , canvas = require('./game/canvas')
  , rect = require('./game/rect')
  , physics = require('./game/physics')
  , core = require('./game/core')
  , input = require('./game/input')

domReady(function() {
  var player = rect.create(canvas.halfwidth(), canvas.halfheight(), 3, 3)
    , enemies = core.repeat(100, spawnEnemy)
  
  input.init()

  setInterval(function() {
    clear()
    player = physics.apply(player)
    player = input.applyImpulses(player)
    enemies = core.map(enemies, physics.apply)
    enemies = core.map(enemies, rect.gravitateTowards, player, 0.01)
    rect.draw(player)
    core.each(enemies, function(enemy) { rect.draw(enemy) })
  }, 1000/30)
})

function clear() {
  canvas.context().fillStyle = '#000'
  canvas.context().fillRect(0,0, canvas.width(), canvas.height())
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
