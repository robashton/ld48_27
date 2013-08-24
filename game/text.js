var canvas = require('./canvas')

exports.draw = function(text, x, y, size) {
  canvas.context().font = 'italic 40pt Calibri';
  canvas.context().fillStyle = '#FFF'
  canvas.context().fillText(text, x, y)
}
