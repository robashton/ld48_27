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
