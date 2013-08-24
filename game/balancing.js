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
  return 0.01 * _level
}

exports.playerImpulse = function() {
  return 0.1
}
