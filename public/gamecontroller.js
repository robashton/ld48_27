(function(e){function i(e,t){var n,r,s,o,u,a=1,f=2,l=true;if(typeof e==="boolean"){l=e;a=2}if(typeof e!=="object"&&!typeof e==="function"){e={}}if(n=t){for(r in n){t=e[r];s=n[r];if(e===s){continue}if(l&&(typeof s=="object"||(o=Object.prototype.toString.call(s)==="[object Array]"))){if(o){o=false;u=t&&Object.prototype.toString.call(t)==="[object Array]"?t:[]}else{u=t&&typeof t=="object"?t:{}}e[r]=i(u,s)}else if(typeof s!=="undefined"){e[r]=s}}}return e}var t=[].slice;var n={}.hasOwnProperty;var r=function(e,t){function i(){this.constructor=e}for(var r in t){if(n.call(t,r))e[r]=t[r]}i.prototype=t.prototype;e.prototype=new i;e.__super__=t.prototype;return e};e.GameController={options:{left:{type:"dpad",position:{left:"13%",bottom:"22%"},dpad:{up:{width:"7%",height:"15%",stroke:2,touchStart:function(){GameController.simulateKeyEvent("press",38);GameController.simulateKeyEvent("down",38)},touchEnd:function(){GameController.simulateKeyEvent("up",38)}},left:{width:"15%",height:"7%",stroke:2,touchStart:function(){GameController.simulateKeyEvent("press",37);GameController.simulateKeyEvent("down",37)},touchEnd:function(){GameController.simulateKeyEvent("up",37)}},down:{width:"7%",height:"15%",stroke:2,touchStart:function(){GameController.simulateKeyEvent("press",40);GameController.simulateKeyEvent("down",40)},touchEnd:function(){GameController.simulateKeyEvent("up",40)}},right:{width:"15%",height:"7%",stroke:2,touchStart:function(){GameController.simulateKeyEvent("press",39);GameController.simulateKeyEvent("down",39)},touchEnd:function(){GameController.simulateKeyEvent("up",39)}}},joystick:{radius:60,touchMove:function(e){console.log(e)}}},right:{type:"buttons",position:{right:"17%",bottom:"28%"},buttons:[{offset:{x:"-13%",y:0},label:"X",radius:"7%",stroke:2,backgroundColor:"blue",fontColor:"#fff",touchStart:function(){GameController.simulateKeyEvent("press",88);GameController.simulateKeyEvent("down",88)},touchEnd:function(){GameController.simulateKeyEvent("up",88)}},{offset:{x:0,y:"-11%"},label:"Y",radius:"7%",stroke:2,backgroundColor:"yellow",fontColor:"#fff",touchStart:function(){GameController.simulateKeyEvent("press",70);GameController.simulateKeyEvent("down",70)},touchEnd:function(){GameController.simulateKeyEvent("up",70)}},{offset:{x:"13%",y:0},label:"B",radius:"7%",stroke:2,backgroundColor:"red",fontColor:"#fff",touchStart:function(){GameController.simulateKeyEvent("press",90);GameController.simulateKeyEvent("down",90)},touchEnd:function(){GameController.simulateKeyEvent("up",90)}},{offset:{x:0,y:"11%"},label:"A",radius:"7%",stroke:2,backgroundColor:"green",fontColor:"#fff",touchStart:function(){GameController.simulateKeyEvent("press",67);GameController.simulateKeyEvent("down",67)},touchEnd:function(){GameController.simulateKeyEvent("up",67)}}],dpad:{up:{width:"7%",height:"15%",stroke:2},left:{width:"15%",height:"7%",stroke:2},down:{width:"7%",height:"15%",stroke:2},right:{width:"15%",height:"7%",stroke:2}},joystick:{radius:60,touchMove:function(e){console.log(e)}}},touchRadius:45},touchableAreas:[],touchableAreasCount:0,touches:[],offsetX:0,offsetY:0,bound:{left:false,right:false,top:false,bottom:false},cachedSprites:{},paused:false,init:function(e){if(!"ontouchstart"in document.documentElement)return;e=e||{};i(this.options,e);var t=navigator.userAgent.toLowerCase();this.performanceFriendly=t.indexOf("iphone")!==-1||t.indexOf("android")!==-1||this.options.forcePerformanceFriendly;var n;if(!this.options.canvas||!(n=document.getElementById(this.options.canvas))){this.options.canvas=document.getElementsByTagName("canvas")[0]}else if(n){this.options.canvas=n}this.options.ctx=this.options.canvas.getContext("2d");this.createOverlayCanvas()},boundingSet:function(e){var t=["left","right"];if(e.width){var n=this.getPixels(e.width);var r=this.getPixels(e.height);var i=this.getPixels(e.x);var s=this.getPixels(e.y)}else{if(this.options.touchRadius)var o=this.getPixels(e.radius)*2+this.getPixels(this.options.touchRadius)/2;else var o=e.radius;var n=r=(o+this.getPixels(e.stroke))*2;var i=this.getPixels(e.x)-n/2;var s=this.getPixels(e.y)-r/2}var u=i+n;var a=s+r;if(this.bound.left===false||i<this.bound.left)this.bound.left=i;if(this.bound.right===false||u>this.bound.right)this.bound.right=u;if(this.bound.top===false||s<this.bound.top)this.bound.top=s;if(this.bound.bottom===false||a>this.bound.bottom)this.bound.bottom=a},createOverlayCanvas:function(){this.canvas=document.createElement("canvas");this.resize(true);document.getElementsByTagName("body")[0].appendChild(this.canvas);this.ctx=this.canvas.getContext("2d");var e=this;window.addEventListener("resize",function(){setTimeout(function(){GameController.resize.call(e)},1)});this.setTouchEvents();this.loadSide("left");this.loadSide("right");this.render();if(!this.touches||this.touches.length==0)this.paused=true},pixelRatio:1,resize:function(e){this.canvas.width=this.options.canvas.width;this.canvas.height=this.options.canvas.height;this.offsetX=GameController.options.canvas.offsetLeft+document.body.scrollLeft;this.offsetY=GameController.options.canvas.offsetTop+document.body.scrollTop;if(this.options.canvas.style.width&&this.options.canvas.style.height&&this.options.canvas.style.height.indexOf("px")!==-1){this.canvas.style.width=this.options.canvas.style.width;this.canvas.style.height=this.options.canvas.style.height;this.pixelRatio=this.canvas.width/parseInt(this.canvas.style.width)}this.canvas.style.position="absolute";this.canvas.style.zIndex="5";this.canvas.style.left=this.options.canvas.offsetLeft+"px";this.canvas.style.top=this.options.canvas.offsetTop+"px";this.canvas.setAttribute("style",this.canvas.getAttribute("style")+" -ms-touch-action: none;");if(!e){this.touchableAreas=[];this.cachedSprites=[];this.reloadSide("left");this.reloadSide("right")}},getPixels:function(e,t){if(typeof e==="undefined")return 0;else if(typeof e==="number")return e;else{if(t=="x")return parseInt(e)/100*this.canvas.width;else return parseInt(e)/100*this.canvas.height}},simulateKeyEvent:function(e,t){if(typeof window.onkeydown==="undefined")return false;if(typeof jQuery!=="undefined"){var n=jQuery.Event("key"+e);n.ctrlKey=false;n.which=t;n.keyCode=t;$(this.options.canvas).trigger(n);return}var r=document.createEvent("KeyboardEvent");if(navigator.userAgent.toLowerCase().indexOf("chrome")!==-1){Object.defineProperty(r,"keyCode",{get:function(){return this.keyCodeVal}});Object.defineProperty(r,"which",{get:function(){return this.keyCodeVal}})}if(r.initKeyboardEvent){r.initKeyboardEvent("key"+e,true,true,document.defaultView,false,false,false,false,t,t)}else{r.initKeyEvent("key"+e,true,true,document.defaultView,false,false,false,false,t,t)}r.keyCodeVal=t},setTouchEvents:function(){var e=this;var t=function(t){if(e.paused){e.paused=false}t.preventDefault();if(window.navigator.msPointerEnabled&&t.clientX&&t.pointerType==t.MSPOINTER_TYPE_TOUCH){e.touches[t.pointerId]={clientX:t.clientX,clientY:t.clientY}}else{e.touches=t.touches||[]}};this.canvas.addEventListener("touchstart",t,false);var n=function(t){t.preventDefault();if(window.navigator.msPointerEnabled&&t.pointerType==t.MSPOINTER_TYPE_TOUCH){delete e.touches[t.pointerId]}else{e.touches=t.touches||[]}if(!t.touches||t.touches.length==0){e.render();e.paused=true}};this.canvas.addEventListener("touchend",n);var r=function(t){t.preventDefault();if(window.navigator.msPointerEnabled&&t.clientX&&t.pointerType==t.MSPOINTER_TYPE_TOUCH){e.touches[t.pointerId]={clientX:t.clientX,clientY:t.clientY}}else{e.touches=t.touches||[]}};this.canvas.addEventListener("touchmove",r);if(window.navigator.msPointerEnabled){this.canvas.addEventListener("MSPointerDown",t);this.canvas.addEventListener("MSPointerUp",n);this.canvas.addEventListener("MSPointerMove",r)}},addTouchableDirection:function(e){var t=new o(e);t.id=this.touchableAreas.push(t);this.touchableAreasCount++;this.boundingSet(e)},addJoystick:function(e){var t=new a(e);t.id=this.touchableAreas.push(t);this.touchableAreasCount++;this.boundingSet(e)},addButton:function(e){var t=new u(e);t.id=this.touchableAreas.push(t);this.touchableAreasCount++;this.boundingSet(e)},addTouchableArea:function(e,t){},loadButtons:function(e){var t=this.options[e].buttons;var n=this;for(var r=0,i=t.length;r<i;r++){if(typeof t[r]==="undefined"||typeof t[r].offset==="undefined")continue;var s=this.getPositionX(e);var o=this.getPositionY(e);t[r].x=s+this.getPixels(t[r].offset.x,"y");t[r].y=o+this.getPixels(t[r].offset.y,"y");this.addButton(t[r])}},loadDPad:function(e){var t=this.options[e].dpad||{};var n=this;var r=this.getPositionX(e);var i=this.getPositionY(e);if(t.up&&t.left&&t.down&&t.right){var s={x:r,y:i,radius:t.right.height};var o=new f(s);this.touchableAreas.push(o);this.touchableAreasCount++}if(t.up!==false){t.up.x=r-this.getPixels(t.up.width,"y")/2;t.up.y=i-(this.getPixels(t.up.height,"y")+this.getPixels(t.left.height,"y")/2);t.up.direction="up";this.addTouchableDirection(t.up)}if(t.left!==false){t.left.x=r-(this.getPixels(t.left.width,"y")+this.getPixels(t.up.width,"y")/2);t.left.y=i-this.getPixels(t.left.height,"y")/2;t.left.direction="left";this.addTouchableDirection(t.left)}if(t.down!==false){t.down.x=r-this.getPixels(t.down.width,"y")/2;t.down.y=i+this.getPixels(t.left.height,"y")/2;t.down.direction="down";this.addTouchableDirection(t.down)}if(t.right!==false){t.right.x=r+this.getPixels(t.up.width,"y")/2;t.right.y=i-this.getPixels(t.right.height,"y")/2;t.right.direction="right";this.addTouchableDirection(t.right)}},loadJoystick:function(e){var t=this.options[e].joystick;t.x=this.getPositionX(e);t.y=this.getPositionY(e);this.addJoystick(t)},reloadSide:function(e){this.loadSide(e)},loadSide:function(e){if(this.options[e].type==="dpad"){this.loadDPad(e)}else if(this.options[e].type==="joystick"){this.loadJoystick(e)}else if(this.options[e].type==="buttons"){this.loadButtons(e)}},normalizeTouchPositionX:function(e){return(e-this.offsetX)*this.pixelRatio},normalizeTouchPositionY:function(e){return(e-this.offsetY)*this.pixelRatio},getXFromRight:function(e){return this.canvas.width-e},getYFromBottom:function(e){return this.canvas.height-e},getPositionX:function(e){if(typeof this.options[e].position.left!=="undefined")return this.getPixels(this.options[e].position.left,"x");else return this.getXFromRight(this.getPixels(this.options[e].position.right,"x"))},getPositionY:function(e){if(typeof this.options[e].position.top!=="undefined")return this.getPixels(this.options[e].position.top,"y");else return this.getYFromBottom(this.getPixels(this.options[e].position.bottom,"y"))},renderAreas:function(){for(var e=0,t=this.touchableAreasCount;e<t;e++){var n=this.touchableAreas[e];if(typeof n==="undefined")continue;n.draw();var r=false;for(var i=0,s=this.touches.length;i<s;i++){var o=this.touches[i];if(typeof o==="undefined")continue;var u=this.normalizeTouchPositionX(o.clientX),a=this.normalizeTouchPositionY(o.clientY);if(n.check(u,a)!==false){if(!r)r=this.touches[i]}}if(r){if(!n.active)n.touchStartWrapper(r);n.touchMoveWrapper(r)}else if(n.active){n.touchEndWrapper(r)}}},render:function(){if(!this.paused||!this.performanceFriendly)this.ctx.clearRect(this.bound.left,this.bound.top,this.bound.right-this.bound.left,this.bound.bottom-this.bound.top);if(!this.paused&&!this.performanceFriendly){var e="touch-circle";var t=this.cachedSprites[e];if(!t&&this.options.touchRadius){var n=document.createElement("canvas");var r=n.getContext("2d");n.width=2*this.options.touchRadius;n.height=2*this.options.touchRadius;var i=this.options.touchRadius;var s=r.createRadialGradient(i,i,1,i,i,this.options.touchRadius);s.addColorStop(0,"rgba( 200, 200, 200, 1 )");s.addColorStop(1,"rgba( 200, 200, 200, 0 )");r.beginPath();r.fillStyle=s;r.arc(i,i,this.options.touchRadius,0,2*Math.PI,false);r.fill();t=GameController.cachedSprites[e]=n}for(var o=0,u=this.touches.length;o<u;o++){var a=this.touches[o];if(typeof a==="undefined")continue;var f=this.normalizeTouchPositionX(a.clientX),l=this.normalizeTouchPositionY(a.clientY);if(f-this.options.touchRadius>this.bound.left&&f+this.options.touchRadius<this.bound.right&&l-this.options.touchRadius>this.bound.top&&l+this.options.touchRadius<this.bound.bottom)this.ctx.drawImage(t,f-this.options.touchRadius,l-this.options.touchRadius)}}if(!this.paused||!this.performanceFriendly){this.renderAreas()}window.requestAnimationFrame(this.renderWrapper)},renderWrapper:function(){GameController.render()}};var s=function(){function e(){}e.prototype.touchStart=null;e.prototype.touchMove=null;e.prototype.touchEnd=null;e.prototype.type="area";e.prototype.id=false;e.prototype.active=false;e.prototype.setTouchStart=function(e){this.touchStart=e};e.prototype.touchStartWrapper=function(e){if(this.touchStart)this.touchStart();this.active=true};e.prototype.setTouchMove=function(e){this.touchMove=e};e.prototype.lastPosX=0;e.prototype.lastPosY=0;e.prototype.touchMoveWrapper=function(t){if(this.touchMove&&(t.clientX!=e.prototype.lastPosX||t.clientY!=e.prototype.lastPosY)){this.touchMove();this.lastPosX=t.clientX;this.lastPosY=t.clientY}this.active=true};e.prototype.setTouchEnd=function(e){this.touchEnd=e};e.prototype.touchEndWrapper=function(e){if(this.touchEnd)this.touchEnd();this.active=false;GameController.render()};return e}();var o=function(e){function t(e){for(var t in e){if(t=="x")this[t]=GameController.getPixels(e[t],"x");else if(t=="y"||t=="height"||t=="width")this[t]=GameController.getPixels(e[t],"y");else this[t]=e[t]}this.draw()}r(t,e);t.prototype.type="direction";t.prototype.check=function(e,t){var n,r;if((Math.abs(e-this.x)<GameController.options.touchRadius/2||e>this.x)&&(Math.abs(e-(this.x+this.width))<GameController.options.touchRadius/2||e<this.x+this.width)&&(Math.abs(t-this.y)<GameController.options.touchRadius/2||t>this.y)&&(Math.abs(t-(this.y+this.height))<GameController.options.touchRadius/2||t<this.y+this.height))return true;return false};t.prototype.draw=function(){var e=this.type+""+this.id+""+this.active;var t=GameController.cachedSprites[e];if(!t){var n=document.createElement("canvas");var r=n.getContext("2d");n.width=this.width+2*this.stroke;n.height=this.height+2*this.stroke;var i=this.opacity||.9;if(!this.active)i*=.5;switch(this.direction){case"up":var s=r.createLinearGradient(0,0,0,this.height);s.addColorStop(0,"rgba( 0, 0, 0, "+i*.5+" )");s.addColorStop(1,"rgba( 0, 0, 0, "+i+" )");break;case"left":var s=r.createLinearGradient(0,0,this.width,0);s.addColorStop(0,"rgba( 0, 0, 0, "+i*.5+" )");s.addColorStop(1,"rgba( 0, 0, 0, "+i+" )");break;case"right":var s=r.createLinearGradient(0,0,this.width,0);s.addColorStop(0,"rgba( 0, 0, 0, "+i+" )");s.addColorStop(1,"rgba( 0, 0, 0, "+i*.5+" )");break;case"down":default:var s=r.createLinearGradient(0,0,0,this.height);s.addColorStop(0,"rgba( 0, 0, 0, "+i+" )");s.addColorStop(1,"rgba( 0, 0, 0, "+i*.5+" )")}r.fillStyle=s;r.fillRect(0,0,this.width,this.height);r.lineWidth=this.stroke;r.strokeStyle="rgba( 255, 255, 255, 0.1 )";r.strokeRect(0,0,this.width,this.height);t=GameController.cachedSprites[e]=n}GameController.ctx.drawImage(t,this.x,this.y)};return t}(s);var u=function(e){function t(e){for(var t in e){if(t=="x")this[t]=GameController.getPixels(e[t],"x");else if(t=="x"||t=="radius")this[t]=GameController.getPixels(e[t],"y");else this[t]=e[t]}this.draw()}r(t,e);t.prototype.type="button";t.prototype.check=function(e,t){if(Math.abs(e-this.x)<this.radius+GameController.options.touchRadius/2&&Math.abs(t-this.y)<this.radius+GameController.options.touchRadius/2)return true;return false};t.prototype.draw=function(){var e=this.type+""+this.id+""+this.active;var t=GameController.cachedSprites[e];if(!t){var n=document.createElement("canvas");var r=n.getContext("2d");r.lineWidth=this.stroke;n.width=n.height=2*(this.radius+r.lineWidth);var i=r.createRadialGradient(this.radius,this.radius,1,this.radius,this.radius,this.radius);var s;switch(this.backgroundColor){case"blue":i.addColorStop(0,"rgba(123, 181, 197, 0.6)");i.addColorStop(1,"#105a78");s="#0A4861";break;case"green":i.addColorStop(0,"rgba(29, 201, 36, 0.6)");i.addColorStop(1,"#107814");s="#085C0B";break;case"red":i.addColorStop(0,"rgba(165, 34, 34, 0.6)");i.addColorStop(1,"#520101");s="#330000";break;case"yellow":i.addColorStop(0,"rgba(219, 217, 59, 0.6)");i.addColorStop(1,"#E8E10E");s="#BDB600";break;case"white":default:i.addColorStop(0,"rgba( 255,255,255,.3 )");i.addColorStop(1,"#eee");break}if(this.active)r.fillStyle=s;else r.fillStyle=i;r.strokeStyle=s;r.beginPath();r.arc(n.width/2,n.width/2,this.radius,0,2*Math.PI,false);r.fill();r.stroke();if(this.label){r.fillStyle=s;r.font="bold "+(this.fontSize||n.height*.35)+"px Verdana";r.textAlign="center";r.textBaseline="middle";r.fillText(this.label,n.height/2+2,n.height/2+2);r.fillStyle=this.fontColor;r.font="bold "+(this.fontSize||n.height*.35)+"px Verdana";r.textAlign="center";r.textBaseline="middle";r.fillText(this.label,n.height/2,n.height/2)}t=GameController.cachedSprites[e]=n}GameController.ctx.drawImage(t,this.x,this.y)};return t}(s);var a=function(e){function t(e){for(var t in e)this[t]=e[t];this.currentX=this.currentX||this.x;this.currentY=this.currentY||this.y}r(t,e);t.prototype.type="joystick";t.prototype.check=function(e,t){if(Math.abs(e-this.x)<this.radius+GameController.getPixels(GameController.options.touchRadius)/2&&Math.abs(t-this.y)<this.radius+GameController.getPixels(GameController.options.touchRadius)/2)return true;return false};t.prototype.moveDetails={};t.prototype.touchMoveWrapper=function(e){this.currentX=GameController.normalizeTouchPositionX(e.clientX);this.currentY=GameController.normalizeTouchPositionY(e.clientY);if(this.touchMove){if(this.moveDetails.dx!=this.currentX-this.x&&this.moveDetails.dy!=this.y-this.currentY){this.moveDetails.dx=this.currentX-this.x;this.moveDetails.dy=this.y-this.currentY;this.moveDetails.max=this.radius+GameController.options.touchRadius/2;this.moveDetails.normalizedX=this.moveDetails.dx/this.moveDetails.max;this.moveDetails.normalizedY=this.moveDetails.dy/this.moveDetails.max;this.touchMove(this.moveDetails)}}this.active=true};t.prototype.draw=function(){if(!this.id)return false;var e=this.type+""+this.id+""+this.active;var t=GameController.cachedSprites[e];if(!t){var n=document.createElement("canvas");this.stroke=this.stroke||2;n.width=n.height=2*(this.radius+GameController.options.touchRadius+this.stroke);var r=n.getContext("2d");r.lineWidth=this.stroke;if(this.active){var i=r.createRadialGradient(0,0,1,0,0,this.radius);i.addColorStop(0,"rgba( 200,200,200,.5 )");i.addColorStop(1,"rgba( 200,200,200,.9 )");r.strokeStyle="#000"}else{var i=r.createRadialGradient(0,0,1,0,0,this.radius);i.addColorStop(0,"rgba( 200,200,200,.2 )");i.addColorStop(1,"rgba( 200,200,200,.4 )");r.strokeStyle="rgba( 0,0,0,.4 )"}r.fillStyle=i;r.beginPath();r.arc(this.radius,this.radius,this.radius,0,2*Math.PI,false);r.fill();r.stroke();t=GameController.cachedSprites[e]=n}GameController.ctx.fillStyle="#444";GameController.ctx.beginPath();GameController.ctx.arc(this.x,this.y,this.radius*.7,0,2*Math.PI,false);GameController.ctx.fill();GameController.ctx.stroke();GameController.ctx.drawImage(t,this.currentX-this.radius,this.currentY-this.radius)};return t}(s);var f=function(e){function t(e){for(var t in e){if(t=="x")this[t]=GameController.getPixels(e[t],"x");else if(t=="x"||t=="radius")this[t]=GameController.getPixels(e[t],"y");else this[t]=e[t]}this.draw()}r(t,e);t.prototype.check=function(e,t){return false};t.prototype.draw=function(){GameController.ctx.fillStyle="rgba( 0, 0, 0, 0.5 )";GameController.ctx.beginPath();GameController.ctx.arc(this.x,this.y,this.radius,0,2*Math.PI,false);GameController.ctx.fill()};return t}(s);(function(){if(typeof module!=="undefined")return;var e=0;var t=["ms","moz","webkit","o"];for(var n=0;n<t.length&&!window.requestAnimationFrame;++n){window.requestAnimationFrame=window[t[n]+"RequestAnimationFrame"];window.cancelAnimationFrame=window[t[n]+"CancelAnimationFrame"]||window[t[n]+"CancelRequestAnimationFrame"]}if(!window.requestAnimationFrame)window.requestAnimationFrame=function(t,n){var r=(new Date).getTime();var i=Math.max(0,16-(r-e));var s=window.setTimeout(function(){t(r+i)},i);e=r+i;return s};if(!window.cancelAnimationFrame)window.cancelAnimationFrame=function(e){clearTimeout(e)}})()})(typeof module!=="undefined"?module.exports:window)