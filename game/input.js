var rect = require('./rect')

var _left = false,
    _right = false,
    _down = false,
    _up = false

 exports.init = function() {
   document.onkeydown = onKeyDown
   document.onkeyup = onKeyUp
 }

 exports.apply = function(player) {
   var x = _left ? -1 : _right ? 1 : 0 
     , y = _up ? -1 : _down ? 1 : 0
   return rect.applyImpulse(player, x, y, 0.1)
 }

 function onKeyDown(e) {
   onKeyChange(e, true)
 }
 function onKeyUp(e) {
   onKeyChange(e, false)
 }

 function onKeyChange(e, val) {
   switch(e.keyCode) {
     case 37:
      _left = val
      break;
     case 38:
      _up = val
      break;
     case 39:
      _right = val
      break;
     case 40:
      _down = val
      break;
   }
   return false
 }

