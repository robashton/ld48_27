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
