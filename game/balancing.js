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
