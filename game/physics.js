var apply = exports.apply = function(rect) {
  rect.x += rect.vx
  rect.y += rect.vy
  rect.vx *= (1.0 - rect.friction)
  rect.vx *= (1.0 - rect.friction)
  return rect
}
