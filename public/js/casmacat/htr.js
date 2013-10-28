(function(module, global) {

  var htr = module.exports = {
    init: function($canvas, $source, $target) {

      // Ensure we receive a jQuery element
      if (!$canvas.is('canvas')) throw Error("Canvas element not defined");
            
      // Load libs -------------------------------------------------------------
      window.jSketch = require("jsketch");
      window.MathLib = require("math-utils");
      
      require("jquery.sketchable");
      
      var MG = require("mg-recognizer");
      var HC = require("htrclient");
      var GU = require("geometry-utils");

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
      var decoderTimer = 0, timerMs = 800;
      var canvasForwarderTimer = 0, canvasForwarderTimerMs = 100;
      var insert_after_token, insertion_token, insertion_token_space;

      function getTokenDistanceAtPointer(e) {
        var tokenDistance = {
          token: null,
          distance: {d: 0, dx: 0, dy: 0}
        }
        if (typeof(insert_after_token) !== 'undefined') {
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
        var $options = $canvas.next('.canvas-options');
        var centroid = MathLib.centroid(stroke);
        centroid = getAbsoluteXY(centroid);
        console.log("--------> processGesture:", gesture.name, centroid)
        switch (gesture.name) {
          case 'dot': // reject 
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            var tokenDistancesInLine = tokenDistances.filter(function(a){ return a.distance.dy === 0});;
            if (tokenDistancesInLine.length > 0 && tokenDistancesInLine[0].distance.d < 3) {
              var token = tokenDistancesInLine[0];
              $options.html('<strong>Reject</strong> '+$(token.token).text()); 
              doRejectGesture($(token.token));
            }
            break;
          case 'se': // delete
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            var tokenDistancesInLine = tokenDistances.filter(function(a){ return a.distance.dy < 3 });;
            if (tokenDistancesInLine.length > 0 && tokenDistancesInLine[0].distance.d < 3) {
              var token = tokenDistancesInLine[0];
              $options.html('<strong>Delete</strong> '+$(token.token).text()); 
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
              $options.html('<strong>Inserting handwritting text ...</strong>'); 
              doInsertGesture($token);
            }
            break;
          case 'ne': // validate 
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            if (tokenDistances[0].distance.dx > 0 || tokenDistances[0].distance.dy !== 0) {
              $options.html('<strong>Validate segment<strong>'); 
              doValidateGesture();
            }
            break;
          case 'n': // set caret 
            var clientCentroid = [centroid[0] - $(window).scrollLeft(), centroid[1] - $(window).scrollTop()];
            //$canvas.hide()
            //$canvas.next().hide()
            //var range;
            //if (typeof document.caretRangeFromPoint !== 'undefined') {
            //  range = document.caretRangeFromPoint(e.pageX, e.pageY);
            //}
            //else {
            //  range = document.caretPositionFromPoint(e.pageX, e.pageY);
            //}
            //$canvas.show()
            //$canvas.next().show()
            var caretPos = GU.getCaretPositionFromXY($target[0], clientCentroid[0], clientCentroid[1]);
            $target.focus();
            $target.editable('setCaretPos', caretPos);
            $options.html('<strong>Setting caret to introduce typed text ...</strong>'); 
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
                $canvas.next('.canvas-options').html('');
                $('.epen-selected', $target).toggleClass('epen-selected', false);

                gesture = gestureRecognizer.recognize(strokes);
                console.log("GESTURE", gesture);
                // first HTR stroke
                if (!gesture || typeof(insert_after_token) !== 'undefined') {
                  var centroid = getAbsoluteXY(MathLib.centroid(strokes[0].slice(0, 20)));
                  var tokenDistance = getTokenDistanceAtPointer({clientX: centroid[0], clientY: centroid[1]});
                  var caretPos = $target.editable('getTokenPos', tokenDistance.token);
                  console.log('TOKDIST', tokenDistance, caretPos);
                  casmacatHtr.startSession({
                    source: $source.editable('getText'),
                    target: $target.editable('getText'),
                    caretPos: caretPos,
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
                var $options = $canvas.next('.canvas-options');
                $options.html("<strong>Decoding strokes ...</strong>");
                casmacatHtr.addStroke({points: strokes[strokes.length-1], is_pen_down: true});      
                decoderTimer = setTimeout(function () {
                  //$('#btn-decode').trigger('click');
                  skanvas.sketchable('clear');
                }, timerMs);
              }
            },

            clear: function(elem, data) {
              // skanvas.removeData('htr');
              casmacatHtr.endSession({
                maxNBests: 30,
              });
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

      function replace_suggestion(result) {
        var $selectedToken = $('.epen-selected', $target), $nextToken = $selectedToken.next('.editable-token');
        $selectedToken.text(result.text);
        //$replaced = $target.editable('replaceText', result.test, result.textSegmentation, $replaced, false && is_final);
 
        var cursorPos = $target.editable('getTokenPos', $nextToken);
        $target.editableItp('setPrefix', cursorPos)
        console.log('update at', cursorPos, $nextToken);
      }

      function update_htr_suggestions(data, is_final) {
        if (!data || !data.nbest || !data.nbest.length) return;
        var best = data.nbest[0];
        if (!best.text || best.text === "") return;
        //console.log(best.text, best.textSegmentation);
        var htrData = skanvas.data('htr');
        var $originalToken = $(htrData.target.token);
        if (htrData.target) {
          $originalToken.toggleClass('epen-selected');
          replace_suggestion(best);

          var $options = $canvas.next('.canvas-options');
          $options.html('<ul/>'); 

          var $list = $('ul', $options).on('click', function(e) { 
            var result = $(e.target).data('result');
            replace_suggestion(result);
          });
          for (var n = 0; n < data.nbest.length; n++) {
            var $result = $('<li>' +  data.nbest[n].text + '</li>').data('result', data.nbest[n]);
            $list.append($result);
          }
        }
        
      };


    },

    attachEvents: function($target) {
      var namespace = 'itp';
      $target.on('enableEpenToggle.'+namespace, function(e, value) {
        var cfg = $target.data(namespace).config;
        cfg.epenEnabled = toggleOpt($target, "opt-epen", value);
        toggleEpenMode($target, cfg.epenEnabled);
        $target.trigger('togglechange', ['enableEpen', cfg.epenEnabled, cfg]);
      });
    }




  };

  function toggleOpt($elem, opt, value) {
    var elem = $elem.get(0);
    if (typeof value === "undefined") {
      value = (elem.getAttribute("data-" + opt) !== "true");
    }
    elem.setAttribute("data-" + opt, value);
    return value;
  }




  function toggleEpenMode($target, value) {
    var sid = $target.data('sid'), prefix = "#segment-" + sid;
    var $source = $(prefix + "-source"), $section = $(prefix), animMs = 300;
    var $targetParent = $(prefix + "-target");
    $section.find('.wrap').toggleClass("epen-wrap", value);
    $source.toggleClass("epen-source", animMs, function(){}, value);
    $target.toggleClass("epen-target", animMs, function(){
      var $canvas = $targetParent.find('canvas'), $clearBtn = $('.buttons', UI.currentSegment).find('.pen-clear-indicator');
      // Create canvas on top
      if ($canvas.length === 0) {
        var geom = require('geometry-utils'),
             pos = $target.offset(),
             siz = { width: $target.width() + 20, height: $target.height() + 10 };

        $canvas = $('<canvas tabindex="-1" id="'+prefix+'-canvas" width="'+siz.width+'" height="'+siz.height+'"/>');
        $canvas.prependTo($targetParent).hide().delay(10).css({
            left: ($section.find('.wrap').width() - siz.width - $section.find('.status-container').width()/2) / 2,
            zIndex: geom.getNextHighestDepth(),
        }).bind('mousedown mouseup click', function(e){
          // This is to prevent logging click events on the canvas
          e.stopPropagation();
        });

  
        $options = $('<div tabindex="-1" class="canvas-options"></div>');
        $canvas.after($options);


        // the size of canvas-options should be computed AFTER canvas transition is over. Thus, we wait 20ms. Ideally, we shoud use jQuery 1.8 'deferred.then'
        setTimeout(function(){
            console.log('CANVAS', $canvas, $canvas.offsetParent().offsetParent().position(), $canvas.offset(), $canvas.position(), $canvas.height());
            $options.css({
                left: ($section.find('.wrap').width() - siz.width - $section.find('.status-container').width()/2) / 2,
                width: siz.width + 2,
                top: $canvas.position().top + $canvas.height(),
                zIndex: 99999 
            });
          }, 20); 
          
        htr.init($canvas, $source, $target);

        // A button to clear canvas (see http://ikwebdesigner.com/special-characters/)
        if ($clearBtn.length === 0) {
          $clearBtn = $('<li/>').html('<a href="#" class="itp-btn pen-clear-indicator" title="Clear drawing area">&#10227;</a>');
          $clearBtn.click(function(e){
            e.preventDefault();
            $canvas.sketchable('clear');
          });
          $('.buttons', UI.currentSegment).prepend($clearBtn);
          $clearBtn.hide();
        }
      } else {
        $canvas = $targetParent.find('canvas');
        $options = $targetParent.find('.canvas-options');
      }
      /*
      // TODO: Remove suffix length feature for e-pen mode and restore previous prioritizer
      $target.editableItp('updateConfig', {
        prioritizer: "none"
      });
      */
      // Toggle buttons
      $canvas.sketchable('clear').toggle();
      $clearBtn.toggle();
      // Toggle translation matches et al.
      $section.find('.overflow').toggle(animMs);
      // Remove contenteditable selection
      var sel = window.getSelection();
      sel.removeAllRanges();
    }, value);
    //$options.toggleClass('hide', animMs, function(){}, !value);
  };
  


  if (config.penEnabled) {
    var original_deActivateSegment = UI.deActivateSegment;
    UI.deActivateSegment = function(byButton) {
      var $segment = (byButton)? this.currentSegment : this.lastOpenedSegment;
      if ($segment) {
        $('.epen-wrap',   $segment).toggleClass('epen-wrap', false);
        $('.epen-source', $segment).toggleClass('epen-source', false);
        $('.epen-target', $segment).toggleClass('epen-target', false);
        $('canvas', $segment).remove();
        $('.canvas-options', $segment).remove();
      }
      original_deActivateSegment.call(UI, byButton);
    };
  }



})('object' === typeof module ? module : {}, this);
