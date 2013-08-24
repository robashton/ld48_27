var canvas = require('./canvas')

exports.draw =  function(rect) {
  canvas.context().fillStyle = rect.render.colour
  canvas.context().fillRect(rect.x, rect.y, rect.w, rect.h)
}

exports.create = function(x, y, w, h) {
  return {
    x: x,
    y: y,
    w: w,
    h: h,
    vx: 0,
    vy: 0,
    friction: 0.01,
    render: {
      colour: '#FFF'
    }
  }
}

exports.applyImpulse = function(rect, vx, vy, amount) {
  rect.vx += vx*amount;
  rect.vy += vy*amount;
  return rect
}

var vectorTo = function(src, dest) {
  var x = dest.x - src.x
    , y = dest.y - src.y
    , m = Math.sqrt((x*x)+(y*y))
  

  return {
    x: x/m,
    y: y/m
  }
}

exports.gravitateTowards = function(src, dest, power) {
  var vector = vectorTo(src, dest)
  src.vx += vector.x * power
  src.vy += vector.y * power
  return src
}
