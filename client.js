var domReady = require('domready')


domReady(function() {
  var canvas = document.getElementById('game')
    , context = canvas.getContext('2d')

  setInterval(function() {



      context.fillStyle = '#000'
      context.fillRect(0,0, canvas.width, canvas.height)
  }, 1000/30)

})


