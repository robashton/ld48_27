var each = exports.each = function(items, fn) {
  for(var i = 0 ; i < items.length; i++) {
    fn(items[i])
  }
}

var map = exports.map = function(items, fn) {
  for(var i = 0 ; i < items.length; i++) {
    items[i] = fn(items[i])
  }
  return items
}

var repeat = exports.repeat = function(times, fn) {
  var result = new Array(times)
  for(var i = 0; i < times; i++)
    result[i] = fn()
  return result
}
