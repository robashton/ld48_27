var canvas = require('./canvas')
  , core = require('./core')

var _collisionBuffer = new Array(1000)
for(var i = 0 ; i < 1000; i++)
  _collisionBuffer[i] = { collision: false, one: 0, two: 0 }

exports.apply = function(rect) {
  rect.x += rect.vx
  rect.y += rect.vy
  rect.vx *= (1.0 - rect.friction)
  rect.vy *= (1.0 - rect.friction)
  return rect.boundscheck(rect)
}


exports.collideWithList = function(rect, list) {
  var current = 0
  _collisionBuffer = core.updatein(_collisionBuffer, clearCollision)
  for(var i = 0; i < list.length; i++) {
    if(!collide(list[i], rect)) continue
      _collisionBuffer[current].collision = true
      _collisionBuffer[current++].one = i
  }
  return _collisionBuffer
}


function clearCollision(item) {
  item.collision = false
  return item
}


exports.collideLists = function(one, two) {
  var current = 0
  _collisionBuffer = core.updatein(_collisionBuffer, clearCollision)
  for(var i = 0; i < one.length; i++) {
    for(var j = 0 ; j < two.length; j++) {
      if(!collide(one[i], two[j])) continue
      _collisionBuffer[current].collision = true
      _collisionBuffer[current].one = i
      _collisionBuffer[current++].two = j 
    }
  }
  return _collisionBuffer
}

var collide = exports.collide = function(one, two) {
  if(!one.alive || !two.alive) return false
  if(one.x + one.w < two.x) return false
  if(one.y + one.h < two.y) return false
  if(two.x + two.w < one.x) return false
  if(two.y + two.h < one.y) return false
  return true
}

function outsideHorizontal(rect) {
  return (rect.x < 0 && rect.vx < 0) ||
    (rect.x > canvas.width() && rect.vx > 0)
}

function outsideVertical(rect) {
  return (rect.y < 0 && rect.vy < 0) ||
    (rect.y > canvas.height() && rect.vy > 0)
}

exports.boundskill = function(rect) {
  if(outsideHorizontal(rect) || outsideVertical(rect))
    rect.alive = false
  return rect
}

exports.boundsbounce = function(rect) {
  if(outsideHorizontal(rect))
      rect.vx = -rect.vx
  if(outsideVertical(rect))
      rect.vy = -rect.vy
  return rect
}
