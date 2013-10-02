(function(module, global){

  module.exports = {
    init: function($canvas, $source, $target) {

      // Ensure we receive a jQuery element
      if (!$canvas.is('canvas')) throw Error("Canvas element not defined");
            
      // Load libs -------------------------------------------------------------
      window.jSketch = require("jsketch");
      window.MathLib = require("math-utils");
      
      require("jquery.sketchable");
      
      var MG = require("mg-recognizer");
      var HC = require("htrclient");

      // Setup -----------------------------------------------------------------
      var gestureRecognizer = new MG();
      
      var casmacatHtr = new HC();
      casmacatHtr.connect(config.htrserver);
      
      function setHtrConf() {
        casmacatHtr.configure({
          canvasSize: { width: $canvas.width(), height: $canvas.height() },
          device: window.navigator.userAgent
        });
      };
      
      // Socket.IO callbacks ---------------------------------------------------
      // See https://github.com/LearnBoost/socket.io/wiki/Exposed-events
      
      casmacatHtr.on('disconnect', function(){ 
        casmacatHtr.checkConnection(); 
      });
      casmacatHtr.on('reconnect', function(){ 
        setHtrConf();
      });

      setHtrConf(); // first-time load
      
      function getRelativeXY(point) {
        var leftBorder  = parseInt(skanvas.css('borderLeftWidth')) || 0;
        var topBorder   = parseInt(skanvas.css('borderTopWidth'))  || 0;
        var leftPadding = parseInt(skanvas.css('paddingLeft'))     || 0;
        var topPadding  = parseInt(skanvas.css('paddingTop'))      || 0;
        var offset = skanvas.offset();
        var mouseX = point[0] - offset.left - leftBorder - leftPadding;
        var mouseY = point[1] - offset.top  - topBorder  - topPadding;
        //console.log("Relative:", point, [mouseX, mouseY]);
        return [mouseX, mouseY];
      };

      function getAbsoluteXY(point) {
        var leftBorder  = parseInt(skanvas.css('borderLeftWidth')) || 0;
        var topBorder   = parseInt(skanvas.css('borderTopWidth'))  || 0;
        var leftPadding = parseInt(skanvas.css('paddingLeft'))     || 0;
        var topPadding  = parseInt(skanvas.css('paddingTop'))      || 0;
        var offset = skanvas.offset();
        var mouseX = point[0] + offset.left + leftBorder + leftPadding;
        var mouseY = point[1] + offset.top  + topBorder  + topPadding;
        //console.log("Absolute:", point, [mouseX, mouseY]);
        return [mouseX, mouseY];
      };


      // helper function to limit the number of server requests
      // at least throttle_ms have to pass for events to trigger 
      var decoderTimer = 0, timerMs = 400;
      var canvasForwarderTimer = 0, canvasForwarderTimerMs = 100;
      var insert_after_token, insertion_token, insertion_token_space;

      function getTokenDistanceAtPointer(e) {
        var tokenDistance = {
          token: null,
          distance: {d: 0, dx: 0, dy: 0}
        }
        if (insert_after_token) {
          var res = $target.editable('appendWordAfter', '', insert_after_token, ($target.text() !== '')?' ':'');
          tokenDistance.token = insertion_token = res.$token;
          insertion_token_space = res.$spaces;
        }
        else {
          var tokens = $target.editable('getTokensAtXY', [e.clientX, e.clientY]);
          if (tokens.length > 0) {
            // find the closest tokens to the right
            tokens = tokens.filter(function(a){ return a.distance.dx <= 0});
            // if any
            if (tokens.length > 0) {
              tokenDistance = tokens[0];
            }
            // no tokens were found to the right so append at the end
            if (!tokenDistance.token) {
              $lastToken  = $('span.editable-token:last-child', $target);
              var res = $target.editable('appendWordAfter', '', $lastToken, ' ');
              tokenDistance.token = insertion_token = res.$token;
              insertion_token_space = res.$spaces;
            }
          }
          // no tokens were found so append at the beginnig 
          else {
            var res = $target.editable('appendWordAfter', '', null, '');
            tokenDistance.token = insertion_token = res.$token;
            insertion_token_space = res.$spaces;
          }
        }
        return tokenDistance;
      };

      // Gesture callbacks -----------------------------------------------------
      function doRejectGesture($token) {
        $target.editableItp('rejectSuffix', $target.editable('getTokenPos', $token[0]))
        console.log('reject', $token);
      };

      function doDeleteGesture($token) {
        var t = $token, n;
        console.log('delete', $token);
        do {
          //console.log('deleting', '"' + t.text() + '"', t);
          n = $(t[0].nextSibling);
          t.remove(); 
          t = n;
        } while (t && !t.is('.editable-token') && t[0].nextSibling);
        
        var cursorPos = $target.editable('getTokenPos', t.next());
        //console.log('update at', cursorPos, '"' + $target.text().slice(0, cursorPos)  + '"');
        $target.editableItp('setPrefix', cursorPos)
      };

      function doInsertGesture($token) {
        //var query = {
        //  source: $source.text(),
        //  caretPos: 0,
        //  numResults: 2,
        //}

        insert_after_token = $token; 
        console.log('insertion token', insert_after_token);
        // decoderTimer = setTimeout(function () {
        //   $('#btn-decode').trigger('click');
        // }, timerMs);
      };

      function doValidateGesture($token) {
        //var query = {
        //  source: $source.text(),
        //  caretPos: 0,
        //  num_results: 1,
        //}
        console.log('validate');
      };

      function processGesture(gesture, stroke) {
        var centroid = MathLib.centroid(stroke);
        centroid = getAbsoluteXY(centroid);
        console.log("--------> processGesture:", gesture.name, centroid)
        switch (gesture.name) {
          case 'dot': // reject 
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            var tokenDistancesInLine = tokenDistances.filter(function(a){ return a.distance.dy === 0});;
            if (tokenDistancesInLine.length > 0 && tokenDistancesInLine[0].distance.d < 3) {
              var token = tokenDistancesInLine[0];
              doRejectGesture($(token.token));
            }
            break;
          case 'se': // delete
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            var tokenDistancesInLine = tokenDistances.filter(function(a){ return a.distance.dy < 3 });;
            if (tokenDistancesInLine.length > 0 && tokenDistancesInLine[0].distance.d < 3) {
              var token = tokenDistancesInLine[0];
              doDeleteGesture($(token.token));
            }
            break;
          case 's': // insert
            var tokenDistances = $target.editable('getTokensAtXY', centroid, -3);
            var tokenDistancesInLine = tokenDistances.filter(function(a){ return a.distance.dy === 0});;
            if (tokenDistancesInLine.length > 0 && tokenDistancesInLine[0].distance.d !== 0) {
              var leftTokens = tokenDistancesInLine.filter(function(a){ return a.distance.dx > 0});
              var $token = (leftTokens.length > 0)?$(leftTokens[0].token):null;
              console.log('left tokens', leftTokens);
              doInsertGesture($token);
            }
            break;
          case 'ne': // validate 
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            if (tokenDistances[0].distance.dx > 0 || tokenDistances[0].distance.dy !== 0) {
              doValidateGesture();
            }
            break;
          default:
            console.log("Gesture not implemented or out of context", gesture, centroid, tokenDistances);
            break;
        }
      };


      // Instantiate a drawable canvas -----------------------------------------
      var lastElementOnMouse, skanvas = $canvas.sketchable({
          interactive: true,
          events: {
          
            mouseDown: function(e) {
              clearTimeout(decoderTimer);
            },
            
            mouseUp: function(e) {
              e.preventDefault();
              var gesture, strokes = skanvas.sketchable('strokes');
              if (!strokes || !strokes[0]) return false;
              // one stroke means either gesture or first HTR stroke
              if (strokes.length === 1) {
                gesture = gestureRecognizer.recognize(strokes);
                console.log("GESTURE", gesture);
                // first HTR stroke
                if (!gesture || insert_after_token) {
                  var centroid = getAbsoluteXY(MathLib.centroid(strokes[0].slice(0, 20)));
                  var tokenDistance = getTokenDistanceAtPointer({clientX: centroid[0], clientY: centroid[1]});
                  casmacatHtr.startSession({
                    source: $source.editable('getText'),
                    target: $target.editable('getText'),
                    caretPos: 0,
                  });
                  
                  skanvas.data('htr', { 
                    x: e.clientX, 
                    y: e.clientY, 
                    target: tokenDistance 
                  });
                  
                } else {
                  processGesture(gesture, strokes[0]);
                  skanvas.sketchable('clear');
                }
              }
              if (!gesture) {
                casmacatHtr.addStroke({points: strokes[strokes.length-1], is_pen_down: true});      
                decoderTimer = setTimeout(function () {
                  //$('#btn-decode').trigger('click');
                  skanvas.sketchable('clear');
                }, timerMs);
              }
            },

            clear: function(elem, data) {
              // skanvas.removeData('htr');
              casmacatHtr.endSession();
              clearTimeout(decoderTimer);
            }
         },
         
      }).bind('mousemove', function (e) { 
        clearTimeout(canvasForwarderTimer);
        if (canvasForwarderTimerMs > 0 && !skanvas.data('sketchable').canvas.isDrawing) {
          canvasForwarderTimer = setTimeout(function() {
            var tokens = $target.editable('getTokensAtXY', [e.clientX, e.clientY]);
            var elem; 
            if (tokens.length > 0 && tokens[0].distance.d == 0) {
              elem = $(tokens[0].token);
            }
            if (elem != lastElementOnMouse) {
              if (lastElementOnMouse) lastElementOnMouse.mouseleave();
              if (elem) elem.mouseenter();
            }
            if (elem) {
              elem.mousemove();
            }
            lastElementOnMouse = elem;
          }, canvasForwarderTimerMs);
        }
      });
      
      casmacatHtr.on('addStrokeResult', function(data, errors) {
        console.log('updated', data, errors);
        update_htr_suggestions(data, false);
      });

      casmacatHtr.on('endSessionResult', function(data, errors) {
        console.log('recognized', data);
        update_htr_suggestions(data, true);
        //$('#btn-clear').trigger('click');
        if (insertion_token && insertion_token.text().length === 0) {
          insertion_token.remove();
          if (insertion_token_space) {
            insertion_token_space.remove();
          }
        }
        insert_after_token = undefined;
        insertion_token = undefined;
        insertion_token_space = undefined;
      });

/*      
      $('#btn-decode').click(function(e) {
        casmacatHtr.endSession();
        $(this).attr('disabled', 'true');
      });

      $('#btn-clear').click(function(e){
        skanvas.sketchable('clear');
        $('#decode').attr('disabled', 'true');
        $(this).attr('disabled', 'true');
      });
*/

      function update_htr_suggestions(data, is_final) {
        if (!data || !data.nbest) return;
        var best = data.nbest[0];
        if (!best.text || best.text === "") return;
        //console.log(best.text, best.textSegmentation);
        var htrData = skanvas.data('htr');
        if (htrData.target) {
          $target.editable('replaceText', best.text, best.textSegmentation, htrData.target.token, is_final);
        }
      };


    }
  };

})('object' === typeof module ? module : {}, this);
