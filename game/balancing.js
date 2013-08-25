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
  return 2.5
}

exports.enemyImpulse = function() {
  return 0.05 + (_level * 0.01)
}

exports.playerImpulse = function() {
  return 0.1
}

exports.enemyFriction = function() {
  return 0.1 - (_level * 0.01)
}

exports.enemySpawnCount = function() {
  return 20 + (10 * _level)
}
