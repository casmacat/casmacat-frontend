(function(module, global){

var MathLib = require("math-utils");

function MinGestures(conf) {
  
  var g = {
     N: "n", 
    NW: "nw", 
     W: "w", 
    SW: "sw", 
     S: "s", 
    SE: "se", 
     E: "e",
    NE: "ne"
  };

  // gesture straigh line thresholds
  var xBackThr  = conf && conf.xBackThr  ? conf.xBackThr  : 3; 
  var yBackThr  = conf && conf.yBackThr  ? conf.yBackThr  : 10; 
  var aspectThr = conf && conf.aspectThr ? conf.aspectThr : 3; 
  var dotThr    = conf && conf.dotThr    ? conf.dotThr    : 5; 

  // Main/Secondary Angular Thresholds
  var mat = conf && conf.mat ? conf.mat : 15, 
      sat = conf && conf.sat ? conf.sat : 30;
  // Fit Pearson (SD not tested yet)
  var fp = conf && conf.fp ? conf.fp : 0.3, 
      fs = conf && conf.fs ? conf.fs : 0.2;
  
  function getGestureByAngle(angle) {
    // convert from radians to degrees
    angle *=180/Math.PI;
    // normalize the angle between -180 and 180
    angle = (angle + 180)%360 - 180;
    var code;
    if (angle >= 90 - mat && angle <= 90 + mat) {
      code = g.N;
    } else if (angle >=   135 - sat && angle <=  135 + sat) {
      code = g.NW;
    } else if ((angle >=  180 - mat && angle <=  180 + mat) || 
               (angle >= -180 - mat && angle <= -180 + mat)) {
      code = g.W;
    } else if (angle >=  -135 - sat && angle <= -135 + sat) {
      code = g.SW;
    } else if (angle >=   -90 - mat && angle <=  -90 + mat) {
      code = g.S;
    } else if (angle >=   -45 - sat && angle <=  -45 + sat) {
      code = g.SE;
    } else if (angle >=     0 - mat && angle <=    0 + mat) {
      code = g.E;
    } else if (angle >=    45 - sat && angle <=   45 + sat) {
      code = g.NE;
    }
    return code;
  };
      
  this.recognize = function(strokes) {
    var stroke = [];
    // mirror y axis so that coordinate system us standard
    for (var i = 0; i < strokes[0].length; ++i) { 
      stroke.push([strokes[0][i][0], -strokes[0][i][1]]); 
    }

    var lied = MathLib.fastLieDown(stroke);

    var bb = MathLib.boundingBox(lied.stroke);
    var aspectRatio = bb.width/bb.height;

    if (strokes[0].length <= dotThr || (bb.width < dotThr && bb.height < dotThr)) {
      return { name: 'dot', score: 1 };
    }


    var pixBwd = MathLib.computePixelsBackwards(lied.stroke);

    var name;
    if (pixBwd.x <= xBackThr && pixBwd.y <= yBackThr && aspectRatio >= aspectThr) { // This is a straight line 
      name = getGestureByAngle(lied.fit.angle);
      return { name: name, score: (1 - 1/aspectRatio + Math.exp(-pixBwd.x) + Math.exp(-pixBwd.y))/3 };
    }
  };
  
};
  // Expose
  module.exports = MinGestures;

})('object' === typeof module ? module: {}, this);
