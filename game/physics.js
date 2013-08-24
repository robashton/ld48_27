var canvas = require('./canvas')

var apply = exports.apply = function(rect) {
  rect.x += rect.vx
  rect.y += rect.vy
  rect.vx *= (1.0 - rect.friction)
  rect.vy *= (1.0 - rect.friction)
  return restrictBoundsOf(rect)
}

function restrictBoundsOf(rect) {
  if((rect.x < 0 && rect.vx < 0) ||
    (rect.x > canvas.width() && rect.vx > 0))
      rect.vx = -rect.vx
  if((rect.y < 0 && rect.vy < 0) ||
    (rect.y > canvas.height() && rect.vy > 0))
      rect.vy = -rect.vy
  return rect
}
