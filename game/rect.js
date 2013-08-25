var canvas = require('./canvas')
  , maths = require('./maths')
  , physics = require('./physics')

var _images = { }

function image(path) {
  return _images[path] || (function() {
    _images[path] = new Image()
    _images[path].src = path
    return _images[path]
  })()
}

exports.draw =  function(rect) {
  if(!rect.alive) return
  if(rect.render.image) {
    canvas.context().drawImage(image(rect.render.image), 
      rect.x, rect.y, rect.w, rect.h)
  } else {
    canvas.context().fillStyle = rect.render.colour
    canvas.context().fillRect(rect.x, rect.y, rect.w, rect.h)
  }
}

exports.create = function(x, y, w, h) {
  return {
    x: x,
    y: y,
    w: w,
    h: h,
    vx: 0,
    vy: 0,
    index: 0,
    alive: true,
    age: 0,
    boundscheck: physics.boundsthrough,
    friction: 0.01,
    pushx: 0,
    pushy: 0,
    render: {
      colour: '#FFF'
    }
  }
}

exports.killUsing = function(rects, list, fn) {
  for(var i =0 ; i < list.length; i++) {
    var index = fn(list[i])
    if(index === null) return rects
    rects[index].alive = false
  }
  return rects
}

exports.applyImpulse = function(rect, vx, vy, amount) {
  rect.vx += vx*amount;
  rect.vy += vy*amount;
  return rect
}

var vectorTo = exports.vectorTo = function(src, dest) {
  return maths.vectorBetween(src.x, src.y, dest.x, dest.y)
}

exports.gravitateTowards = function(src, dest, power) {
  var vector = vectorTo(src, dest)
  src.vx += vector.x * power
  src.vy += vector.y * power
  return src
}
