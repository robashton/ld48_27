var draw = exports.draw =  function(context, rect) {
  context.fillStyle = rect.render.colour
  context.fillRect(rect.x, rect.y, rect.w, rect.h)
}

var create = exports.create = function(x, y, w, h) {
  return {
    x: x,
    y: y,
    w: w,
    h: h,
    vx: 0,
    vy: 0,
    render: {
      colour: '#FFF'
    }
  }
}
