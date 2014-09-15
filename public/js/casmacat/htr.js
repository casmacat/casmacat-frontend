(function(module, global) {

  var throttle = (function(){
    var timer = 0;
    return function(callback, ms){
      clearTimeout (timer);
      timer = setTimeout(callback, ms);
    };
  })();
 
  var htr = module.exports = {
    init: function($canvas, $source, $target) {

      function cfg()     { return $target.data('itp'); }
      function userCfg() { return cfg().config; }


      // Ensure we receive a jQuery element
      if (!$canvas.is('canvas')) throw Error("Canvas element not defined");
            
      // Load libs -------------------------------------------------------------
      window.jSketch = require("jsketch");
      window.MathLib = require("math-utils");
      
      require("jquery.sketchable");
      
      var MG = require("mg-recognizer");
      var HC = require("htrclient");
      var GU = require("geometry-utils");

      var fpsText = "";

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
      var doubleClickTimer = 0, doubleClickTimerMs = 200, doubleClick = false;
      var canvasForwarderTimer = 0, canvasForwarderTimerMs = 50;
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
        $target.editableItp('rejectSuffix', $target.editable('getTokenPos', $token[0]), 10)
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
        
        // XXX: comment out prediction after delete since behaviour has not been properly defined
        //var cursorPos = $target.editable('getTokenPos', t.next());
        ////console.log('update at', cursorPos, '"' + $target.text().slice(0, cursorPos)  + '"');
        //$target.editableItp('setPrefix', cursorPos)
        $target.trigger('editabletextchange', [null, null]);
        $target.trigger('htrtextchange', [{action: 'delete'}, null]);
      };

      function doInsertGesture($token) {
        //var query = {
        //  source: $source.text(),
        //  caretPos: 0,
        //  numResults: 2,
        //}

        console.log('insertion token', insert_after_token);
        insert_after_token = $token; 
        // decoderTimer = setTimeout(function () {
        //   $('#btn-decode').trigger('click');
        // }, timerMs);
      };

      function doValidateGesture($token) {
        console.log('validate');
        var sid = $target.attr('data-sid');
        var $button = $('#segment-' + sid + '-button-translated');
        console.log(sid, $button);
        $button.click();
  
        //$target.editableItp('validate');
      };

      function doUndoGesture($token) {
        //var query = {
        //  source: $source.text(),
        //  caretPos: 0,
        //  num_results: 1,
        //}
        console.log('undo');
        $target.editableItp('undo');
      };

      function doRedoGesture($token) {
        //var query = {
        //  source: $source.text(),
        //  caretPos: 0,
        //  num_results: 1,
        //}
        console.log('redo');
        $target.editableItp('redo');
      };


      function doSetCaretGesture(centroid) {
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
      };

      function doSelectGesture(centroid) {
      }

      function processGesture(gesture, stroke) {
        var $options = $canvas.next('.canvas-options');
        var centroid = MathLib.centroid(stroke);
        centroid = getAbsoluteXY(centroid);

        if (doubleClick && gesture.name === "dot") {
          gesture.name = "double-click";
        }
        doubleClick = false; 

        console.log("--------> processGesture:", gesture.name, centroid)
        switch (gesture.name) {
          case 'n': // reject 
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
          case 'dot': // set caret 
            doubleClick = true;
            doubleClickTimer = setTimeout(function (centroid) {
              return function() {
                doubleClick = false;
                doSetCaretGesture(centroid);
                $options.html('<strong>Setting caret to introduce typed text ...</strong>'); 
                  //$('#btn-decode').trigger('click');
                  skanvas.sketchable('clear');
              }
            }(centroid), doubleClickTimerMs);
            break;
          case 'double-click': // select 
            doSelectGesture(centroid);
            $options.html('<strong>Select text ...</strong>'); 
            break;
          case 'e': // redo
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            if (tokenDistances[0].distance.dx > 0 || tokenDistances[0].distance.dy !== 0) {
              $options.html('<strong>Redo<strong>'); 
              doRedoGesture();
            }
            break;
          case 'w': // undo
            var tokenDistances = $target.editable('getTokensAtXY', centroid, 0);
            if (tokenDistances[0].distance.dx > 0 || tokenDistances[0].distance.dy !== 0) {
              $options.html('<strong>Undo<strong>'); 
              doUndoGesture();
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
              e.stopPropagation();
              clearTimeout(decoderTimer);
              clearTimeout(doubleClickTimer);
            },
            
            mouseUp: function(e) {
              e.preventDefault();
              var gesture = false, strokes = skanvas.sketchable('strokes');
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
                  var canvasRect = $canvas.get(0).getClientRects()[0];
                  var canvasTop = canvasRect.top + parseInt($canvas.css("border-top-width"), 10);
                  var canvasLeft = canvasRect.left + parseInt($canvas.css("border-left-width"), 10);
                  var context = {
                    source: $source.editable('getText'),
                    target: $target.editable('getText'),
                    caretPos: caretPos,
                    extra: {
                      canvasSize: { width: $canvas.width(), height: $canvas.height() },
                      device: window.navigator.userAgent,
                      sourceTokens: $('.editable-token', $source).map(function(){
                        return {
                          'text': $(this).text(),
                          'font': $(this).css('font'),
                          'area': Array.prototype.map.call(this.getClientRects(), function(rect) {
                            return {
                              'top': rect.top - canvasTop,
                              'left': rect.left - canvasLeft,
                              'right': rect.right - canvasLeft,
                              'bottom': rect.bottom - canvasTop,
                              'width': rect.width,
                              'height': rect.height,
                            };
                          }),
                        };
                      }).toArray(),
                      targetTokens: $('.editable-token', $target).map(function(){
                        return {
                          'text': $(this).text(),
                          'font': $(this).css('font'),
                          'area': Array.prototype.map.call(this.getClientRects(), function(rect) {
                            return {
                              'top': rect.top - canvasTop,
                              'left': rect.left - canvasLeft,
                              'right': rect.right - canvasLeft,
                              'bottom': rect.bottom - canvasTop,
                              'width': rect.width,
                              'height': rect.height,
                            };
                          }),
                        };
                      }).toArray(), 
                    }
                  }
                  casmacatHtr.startSession(context);
                  
                  skanvas.data('htr', { 
                    x: e.clientX, 
                    y: e.clientY, 
                    target: tokenDistance 
                  });

                  skanvas.data('isHtr', true);
                  $target.trigger('htrstart', [{context: context}, null]);
                  
                } else {
                  $target.trigger('htrgesture', [{gesture: gesture, stroke: strokes[0]}, null]);
                  processGesture(gesture, strokes[0]);
                  skanvas.sketchable('clear');
                }
              }
              if (!gesture) {
                var $options = $canvas.next('.canvas-options');
                $options.html("<strong>Decoding strokes ...</strong>");
                casmacatHtr.addStroke({points: strokes[strokes.length-1], is_pen_down: true});      
                $target.trigger('htraddstroke', [{points: strokes[strokes.length-1], is_pen_down: true}, null]);
                decoderTimer = setTimeout(function () {
                  //$('#btn-decode').trigger('click');
                  skanvas.sketchable('clear');
                  { // draw fps
                    var fps = 0, sd = 0, n = 0;
                    for (var s = 0; s < strokes.length; s+=2) {
                      for (var i = 1; i < strokes[s].length; ++i) {
                        var hz = 1000.0/(strokes[s][i][2] - strokes[s][i-1][2]);
                        fps += hz; 
                        n++;
                      }
                    }
                    fps /= n;
                    for (var s = 0; s < strokes.length; s+=2) {
                      for (var i = 1; i < strokes[s].length; ++i) {
                        var hz = 1000.0/(strokes[s][i][2] - strokes[s][i-1][2]);
                        sd += (hz - fps) * (hz - fps)
                      }
                    }
                    sd = Math.sqrt(sd/n);
                    //fpsText = "[ " + Math.round(fps - sd) + " , " + Math.round(fps + sd) + " ] hz";
                    fpsText = Math.round(fps) + " hz";
                  }

                }, timerMs);
              }
             },


            clear: function(elem, data) {
              // skanvas.removeData('htr');
              if (skanvas.data('isHtr')) {
                $target.trigger('htrend', [{strokes: skanvas.sketchable('strokes')}, null]);
                casmacatHtr.endSession({ maxNBests: 10, });
                skanvas.removeData('isHtr');
              }
              clearTimeout(decoderTimer);
            }
         },
         
      }).bind('mousemove', function (e) { 
        clearTimeout(canvasForwarderTimer);
        if (canvasForwarderTimerMs > 0 && !skanvas.data('sketchable').canvas.isDrawing && !skanvas.sketchable('strokes').length) {
          function forwardCanvas() {
            var tokens = $target.editable('getTokensAtXY', [e.pageX, e.pageY]);
            var elem; 
            if (tokens.length > 0) {
              $('.editable-token, .editable-space', $target).toggleClass('epen-closest', false);
              $(tokens[0].token).toggleClass('epen-closest', true);
            }
            
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
          }
          forwardCanvas();
          //canvasForwarderTimer = setTimeout(forwardCanvas, canvasForwarderTimerMs);
        }
      });
      
      var updateOnEachStroke = false;
      if (updateOnEachStroke) {
        casmacatHtr.on('addStrokeResult', function(data, errors) {
          update_htr_suggestions(data, false);
          $target.trigger('htrupdate', [data, errors]);
          $target.trigger('htrtextchange', [{action: 'update'}, null]);
        });
      }

      casmacatHtr.on('endSessionResult', function(data, errors) {
        console.log('recognized', data);
        update_htr_suggestions(data, true);
        $target.trigger('htrresult', [data, errors]);
        //$('#btn-clear').trigger('click');
        if (insertion_token && insertion_token.text().length === 0) {
          insertion_token.remove();
          if (insertion_token_space) {
            insertion_token_space.remove();
          }
        }
        var action = (typeof(insert_after_token) !== 'undefined')?'insert':'substitute'; 
        $target.trigger('htrtextchange', [{action: action}, null]);
        insert_after_token = undefined;
        insertion_token = undefined;
        insertion_token_space = undefined;
        $target.trigger('editabletextchange', [null, null]);
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
 
        if (userCfg().mode != 'PE') {
          var cursorPos = $target.editable('getTokenPos', $nextToken);
          $target.editableItp('setPrefix', cursorPos);
        }
        else {
          $target.editableItp('updateTokens');
        }
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
          $options.html('<span id="fps">' + fpsText + '</span><ul/>'); 

          var $list = $('ul', $options).data('nbests', data.nbest).on('click', function(e) { 
            var $this = $(e.target)
              , result = $this.data('result')
              , index = $this.data('index')
              , nbests = $this.parent('ul').data('nbests');

            replace_suggestion(result);
            $target.trigger('htrtextchange', [{action: 'nbestclick'}, null]);
            $target.trigger('htrnbestclick', [{nbests: nbests, result: result, index: index}, null]);
          });
          for (var n = 0; n < data.nbest.length; n++) {
            var $result = $('<li>' +  data.nbest[n].text + '</li>').data('result', data.nbest[n]).data('index', n);
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

      var resizeHandler = function(e) {
        adjustCanvasSize($target);
      }

      $(window).resize(resizeHandler);
      // onresize does not work for elements so we use the trick with DOMSubtreeModified
      $target[0].addEventListener('DOMSubtreeModified', resizeHandler);
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


  function adjustCanvasSize($target) {
    var sid = $target.data('sid'), prefix = "#segment-" + sid;
    var $targetParent = $(prefix + "-target"),
        $canvas = $targetParent.find('canvas'),
        $section = $(prefix),
         pos = $target.offset(),
         siz = { width: $target.outerWidth() + 20, height: $target.outerHeight() };

    if ($canvas.length > 0 && ($canvas.attr('width') != siz.width || $canvas.attr('height') != siz.height)) {
      console.log('ADJUSTING TO', siz);
      $canvas.attr('width', siz.width).attr('height', siz.height);
      $canvas.css({
          left: ($section.find('.wrap').width() - siz.width - $section.find('.status-container').width()/2) / 2,
      });

      setTimeout(function(){
        $options = $canvas.next('.canvas-options');
        console.log('OPTIONS', $options);
        $options.css({
            left: ($section.find('.wrap').width() - siz.width - $section.find('.status-container').width()/2) / 2,
            width: siz.width + 2,
            top: $canvas.position().top + $canvas.outerHeight(),
        });
      }, 100);
    }
  }



  function toggleEpenMode($target, value) {
    var sid = $target.data('sid'), prefix = "#segment-" + sid;
    var $source = $(prefix + "-source"), $section = $(prefix), animMs = 300;
    var $targetParent = $(prefix + "-target");
    $section.find('.wrap').toggleClass("epen-wrap", value);
    $source.toggleClass("epen-source", animMs, function(){}, value);
    $target.toggleClass("epen-target", animMs, function(){
      var $canvas = $targetParent.find('canvas'), $clearBtn = $('.buttons', UI.currentSegment).find('.pen-clear-indicator');
      //merc - trigger logging
      $('.buttons', UI.currentSegment).trigger("epen", [value, $target]);
      // Create canvas on top
      if ($canvas.length === 0) {
        var geom = require('geometry-utils'),
             pos = $target.offset(),
             siz = { width: $target.outerWidth() + 20, height: $target.outerHeight() };

        $canvas = $('<canvas tabindex="-1" id="'+prefix+'-canvas" width="'+siz.width+'" height="'+siz.height+'"/>');
        $canvas.prependTo($targetParent).hide().css({
            left: ($section.find('.wrap').width() - siz.width - $section.find('.status-container').width()/2) / 2,
            zIndex: geom.getNextHighestDepth(),
        }).bind('mousedown mouseup click touchstart touchend', function(e){
          // This is to prevent logging click events on the canvas
          e.stopPropagation();
        });

        $canvas.focus();
        $canvas.on('dragstart', function(){return false});
  
        $options = $('<div tabindex="-1" class="canvas-options"></div>');
        $canvas.after($options);


        // the size of canvas-options should be computed AFTER canvas transition is over. Thus, we wait 20ms. Ideally, we shoud use jQuery 1.8 'deferred.then'
        setTimeout(function(){
            $options.css({
                left: ($section.find('.wrap').width() - siz.width - $section.find('.status-container').width()/2) / 2,
                width: siz.width + 2,
                top: $canvas.position().top + $canvas.outerHeight(),
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
