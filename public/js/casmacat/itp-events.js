// -*- js-indent-level: 2 -*-

// UI events -----------------------------------------------------------------
var ItpVisulization = require('itp-visualization');
var MouseWheel = require("module.mousewheel");
var Memento = require("module.memento");

(function(module, global) {
  // Helper function to limit the number of server requests;
  // at least throttle_ms have to pass for events to trigger 
  var throttle_ms = 50;
  var throttle = (function(){
    var timer = 0;
    return function(callback, ms){
      clearTimeout (timer);
      timer = setTimeout(callback, ms);
    };
  })();
  
  // This function only works with keypress events
  function doesTriggerInteraction(evt) {
    if (typeof evt.which == "undefined") {
      return true;
    } else if (typeof evt.which == "number" && evt.which > 0) {
      if (evt.ctrlKey || evt.altKey) return false;
      return evt.which == 32 || evt.which == 13 || evt.which > 46;
    }
    return false;
  };

  var ItpEvents = function($target, namespace, nsClass, config) {
    var self = this;

    self.vis = new ItpVisulization($target, namespace, nsClass, config);

    var lockReject = false;
    function cfg()     { return $target.data(namespace); }
    function userCfg() { return cfg().config; }
    function $source() { return $target.data(namespace).$source; }
    function reject() {
      var conf = cfg();
      if (conf.config.mode != 'PE' && !lockReject) {
        var target = $target.editable('getText'),
            pos    = $target.editable('getCaretPos');

        lockReject = true;
        conf.itpServer.rejectSuffix({
          target: target,
          caretPos: pos,
          numResults: 1,
        });
      }
    };
 
    // Load modules --------------------------------------
    
    self.mousewheel = new MouseWheel();
    self.mousewheel.init($target, {
      equal: function(data1, data2) {
        return !data1 || (data2 && (data1.nbest.length === 0 || data1.nbest[0].target === data2.nbest[0].target));
      },
      change: function(data) {
        if (!userCfg().allowRejectSuffix || !Boolean($target.editable('getText'))) {
          return false;
        }
        if (data) {
          console.log("Loading previous data...", data);
          self.vis.updateSuggestions(data);
        } else {
          console.log("Rejecting...");
          reject();
        }
      }
    });
      
    self.memento = new Memento();
    self.memento.init($target, {
      start: function() {
        $target.bind('input, editabletextchange', function(e, data, err){
          var tgtText  = $(e.target).editable('getText'),
              caretPos = $(e.target).editable('getCaretPos'),
              currState = self.memento.getState();
          if (!currState || tgtText != currState.text) {
            self.memento.addElement({ text:tgtText, caret:caretPos });
          }
//        }).bind('editabledomchange', function(e, data, err){
//          var clonedNode = $(e.target).clone(true);
//          if (stack.length < 1) {
//            self.memento.addElement(clonedNode);
//          } else {
//            self.memento.replaceElement(pos, clonedNode);
//          }
        });
      },
      equal: function(data1, data2) {
        return !data1 || (data2 && data1.text === data2.text);
      },
      change: function(data) {
        $target.editable('setText', data.text);
        var itpCfg = cfg();
        itpCfg.itpServer.getTokens({
          source: itpCfg.$source.editable('getText'),
          target: $target.editable('getText'),
        });
        if (data.caret) $target.editable('setCaretPos', data.caret);        
      }
    });
 
    self.removeEvents = function() {
      $target.unbind(nsClass);
      cfg().itpServer.removeAllListeners();
    };

    self.attachEvents = function() {
      self.attachItpEvents();
      self.attachUIEvents();
    };

    self.attachItpEvents = function() {
      var itpCfg = cfg();
      var itp    = itpCfg.itpServer;
  
      // Socket.IO callbacks -------------------------------------------------------
      // See https://github.com/LearnBoost/socket.io/wiki/Exposed-events
      itp.on('connect', function() {
        itp.ping({
          ms: new Date().getTime()
        });
        itp.getServerConfig();
        itp.configure(userCfg());

        $target.trigger('ready', 'connect');
      });
      
      itp.on('disconnect', function() {
        itp.checkConnection();
        $target.trigger('unready', 'disconnect');
      });
      
      itp.on('reconnecting', function() { 
        $target.trigger('unready', 'reconnecting');
      });
      
      itp.on('reconnect_failed', function() { 
        $target.trigger('unready', 'reconnect_failed');
      });
    
      itp.on('reconnect', function() { 
        itp.configure(userCfg());
        $target.trigger('ready', 'reconnect');
      });
    
      itp.on('anything', function(obj) {
        console.info("anything:", obj);
      });
    
      itp.on('message', function(msg, callback) {
        console.info("message:", msg);
      });
      
      
      // CatClient callbacks -------------------------------------------------------
      
      //itp.on('receiveLog', function(msg) { console.log('server says:', msg); });
    
      itp.on('resetResult', function(data, err) {
        if (err.length > 0) {
          return
        }

        itp.configure(userCfg());
        $target.trigger('ready', 'reset');
      });
      
      // Handle translation responses
      itp.on('decodeResult', function(data, err) {
        if (err.length > 0) {
          return
        }

        // make sure new data still applies to current source
        if (data.source !== $source().editable('getOriginalText') && data.source !== $source().editable('getText')) {
          if (!data.isPreFetch)
            console.warn("Current source and received source do not match");
          return;
        }
 
        //console.log('contribution changed', data);
        var bestResult = data.nbest[0];
        var conf = userCfg();
	// re-establish touch mode when new window is opened
	if (conf.mode == 'EDIT') {
	  conf.mode = 'TOUCH';
	  $('.itp-indicator').text(newMode);
	}
        if (!window.config.floatPredictions || conf.mode == 'PE' || conf.mode == 'TOUCH') {
          // if we're using the floating box for displaying predictions, don't
          // paste the decoded text into the box
          self.vis.updateSuggestions(data);
        }
		
        //var conf = userCfg();
        //if (conf.mode != 'PE') {
        //  itp.startSession({source: data.source});
        //}

        // Clean previous states
        self.mousewheel.invalidate();
        self.memento.invalidate();
        // First-time use of the mousewheel
        self.mousewheel.addElement(data);

        //XXX: $('#btn-translate').val("Translate").attr("disabled", false);
        $target.trigger('decode', [data, err]);
        $target.trigger('editabletextchange', [data, err]);

        // herve - this ensures that the prediction popup shows up before the
        // user starts translating
        $target.focus();
        if (conf.mode == 'ITP' && window.config.floatPredictions) {
          self.vis.FloatingPrediction.setPredictedText(data);
        }

	// start touch-editing (block from typing, setup click actions on tokens)
	if (conf.mode == "TOUCH") {
	  UI.initTouchEditing();
	}
      });
    
      // function to prompt display of floating prediction box, used by replay
      itp.on('floatingPredictionShow', function(data, err) {
        var conf = userCfg();
        console.log("self.vis.FloatingPrediction.drawTextBox(" + data[0] + ", " + data[1] + ", ...)");
        if (conf.mode == 'ITP' && window.config.floatPredictions) {
          console.log("self.vis.FloatingPrediction.drawTextBox(" + data[0] + ", " + data[1] + ", ...)");
          self.vis.FloatingPrediction.drawTextBox(data[0],data[1],data[2],data[3]);
        }
      });

      itp.on('updateShadeOffTranslatedSource', function() {
        var conf = userCfg();
        self.vis.updateShadeOffTranslatedSource();
      });

      // result from touch editing
      itp.on('redecodeResult', function(data, err) {
        if (err.length > 0) { return }

        // make sure new data still applies to current source
        var $target = $('.editarea', UI.currentSegment);
        var sid = $target.data('sid');
        var $source = $("#segment-" + sid + "-source");
        if (data.source !== $source.editable('getOriginalText') && data.source !== $source().editable('getText')) {
          console.warn("Current source and received source do not match");
          return;
        }

        self.vis.updateSuggestions(data);
        $target.trigger('editabletextchange', [data, err]);
        var targetspans = $('.editable-token', $target);
        for (var i = 0; i < data.annotation.length; i++) {
          $(targetspans[i]).removeClass("touch-edit-neutral");
          $(targetspans[i]).removeClass("touch-edit-good");
          $(targetspans[i]).removeClass("touch-edit-bad");
          if (data.annotation[i] == 0) {
            $(targetspans[i]).addClass("touch-edit-neutral");
          }
          if (data.annotation[i] == -1) {
            $(targetspans[i]).addClass("touch-edit-bad");
          }
          if (data.annotation[i] == 1) {
            $(targetspans[i]).addClass("touch-edit-good");
          }
        }
        $(targetspans[i]).click(function(e) { UI.touchEditingClick(e, $(this)) });
      });

      itp.on('startSessionResult', function(data, err) {
        if (err.length > 0) {
          return
        }

        var query = {
          source: $source().editable('getText'),
          target: $target.editable('getText'),
        }

        cfg().itpServer.getTokens(query);
      });

      // Handle post-editing (target has changed but not source)
      itp.on('applyReplacementRulesResult', function(data, err) {
        if (err.length > 0) {
          return
        }

        if (data.source !== $source().editable('getOriginalText') && data.source !== $source().editable('getText')) return;
        
      	self.vis.updateTranslationDisplay(data);

        // resizes the alignment matrix in a smoothed manner but it does not fill missing alignments 
        // (makes a diff between previous and current tokens and inserts/replaces/deletes columns and rows)
        $target.trigger('tokens', [data, err]);
        $target.trigger('editabledomchange', [data, err]);
      });
    
 
      // Handle post-editing (target has changed but not source)
      itp.on('getTokensResult', function(data, err) {
        if (err.length > 0) {
          return
        }

        // make sure new data still applies to current source and target texts
        if (data.source !== $source().editable('getOriginalText') && data.source !== $source().editable('getText')) return;
        if (data.target !== $target.editable('getText')) return;


      	self.vis.updateTranslationDisplay(data);


        // simulate decode event
        var decodedResult = { 
          elapseTime:         data.elapsedTime,
          source:             data.source,
          sourceSegmentation: data.sourceSegmentation,
          nbest: [{
            elapsedTime: data.elapsedTime,
            target: data.target,
            targetSegmentation: data.targetSegmentation,
            quality: 1.0,
          }]
        }
        // Clean previous states
        self.mousewheel.invalidate();
        // First-time use of the mousewheel
        self.mousewheel.addElement(decodedResult);


        // resizes the alignment matrix in a smoothed manner but it does not fill missing alignments 
        // (makes a diff between previous and current tokens and inserts/replaces/deletes columns and rows)
        $target.trigger('tokens', [data, err]);
        $target.trigger('editabledomchange', [data, err]);
      });
    
      // Handle alignment changes (updates highlighting and alignment matrix) 
      itp.on('getAlignmentsResult', function(data, err) {
        if (err.length > 0) {
          return
        }
        self.vis.updateAlignmentDisplay(data);
        $target.trigger('alignments', [data, err]);
        $target.trigger('editabledomchange', [data, err]);
      });
    
      // Handle confidence changes (updates highlighting) 
      itp.on('getConfidencesResult', function(data, err) {
        if (err.length > 0) {
          return
        }

        //var start_time = new Date().getTime();
        self.vis.updateWordConfidencesDisplay(data);
        //console.log("update_word_confidences_display:", new Date().getTime() - start_time, obj.data.elapsed_time);
        $target.trigger('confidences', [data, err]);
        $target.trigger('editabledomchange', [data, err]);
      });
    
      // Handle confidence changes (updates highlighting) 
      itp.on('rejectSuffixResult', function(data, err) {
        lockReject = false;
      });

      itp.on(['setPrefixResult', 'rejectSuffixResult'], function(data, err) {
        if (err.length > 0) {
          return
        }

        // make sure new data still applies to current source
        if (data.source !== $source().editable('getOriginalText') && data.source !== $source().editable('getText')) {
          console.warn("Current source and received source do not match");
          return;
        }

        if (userCfg().mode == 'ITP' && window.config.floatPredictions)
          self.vis.FloatingPrediction.setPredictedText (data);
        else
          self.vis.updateSuggestions (data);
        
        self.mousewheel.addElement(data);
        $target.trigger('suffixchange', [data, err]);
        $target.trigger('editabletextchange', [data, err]);
      });
    
      // Measure network latency
      itp.on('pingResult', function(data, err) {
        console.log("Received ping:", new Date().getTime() - data.ms);
        $target.trigger('ping', [data, err]);
      });
    
    
      // Receive server configuration 
      itp.on('getServerConfigResult', function(data, err) {
        $target.trigger('serverconfig', [data, err]);
      });
    
      // Handle updates changes (show a list of updated sentences) 
      itp.on('getValidatedContributionsResult', function(data, err) {
        $target.trigger('validatedcontributions', [data, err]);
      });
    
      // Handle models changes (after OL) 
      itp.on('validateResult', function(data, err) {
        $target.trigger('validate', [data, err]);
      });
    }

    self.attachUIEvents = function() {
      var itpCfg  = cfg() 
        , $source = itpCfg.$source
        , itp     = itpCfg.itpServer
        ;

      function onCaretChange(e, d, callback) {
        if (!itp.replay || e.isTrigger) {
          var $token = $(d.token).parent();
          if ($token.is('.editable-token')) {
            var alignments = $token.data('alignments');
            if (alignments && alignments.alignedIds) {
              callback(alignments.alignedIds, 'caret-align');
            }
          }
        }
      };
        
      // #source and #target events
      // caretenter is a new event from jquery.editable that is triggered
      // whenever the caret enters in a new token span
      $target.bind('caretenter' + nsClass, function(e, d) {
        self.vis.updateWordPriorityDisplay($target, $(d.token));
      });
      $([$source[0], $target[0]]).bind('caretenter' + nsClass, function(e, d) {
        onCaretChange(e, d, self.vis.showAlignments);
      })
      // caretleave is a new event from jquery.editable that is triggered
      // whenever the caret leaves a token span
      .bind('caretleave' + nsClass, function(e, d) {
        onCaretChange(e, d, self.vis.hideAlignments);
      })
      .bind('keydown' + nsClass, function(e) {
        // prevent new lines
        if (e.which === 13) {
          //e.stopPropagation(); // We need to capture the event to fire 'save draft translation' fn
          e.preventDefault();
        }
      }).bind('keydown' + nsClass, 'tab', function(e){
        // prevent tabs that move to the next word or to the next priority word
        //e.stopPropagation();
        e.preventDefault();
        tabKeyHandler(e, 'fwd');
      }).bind('keydown' + nsClass, 'shift+tab', function(e){
        //e.stopPropagation();
        e.preventDefault();
        tabKeyHandler(e, 'bck');
      });

      function updateAlignments() {
        var conf = userCfg();
        if (conf.useAlignments) {
          if (conf.displayCaretAlign || conf.displayMouseAlign || conf.displayShadeOffTranslatedSource) {
            var validated_words = $('.editable-token', $target).map(function() { return this.dataset.validated === "true"; }).get();
            var tgtText = $target.editable('getText');
            if (conf.mode == 'ITP' && window.config.floatPredictions) {
              tgtText = self.vis.FloatingPrediction.getPredictedText();
              if (tgtText == null) { return; }
            }
            var query = {
              source: $source.editable('getOriginalText'),
              target: tgtText,
              validated_words: validated_words, 
            }
            itp.getAlignments(query);
          }
        }
      }

      function updateConfidences() {
        var conf = userCfg();
        if (conf.useAlignments) {
          if (conf.displayConfidences) {
            var validated_words = $('.editable-token', $target).map(function() { return this.dataset.validated === "true"; }).get();
            var query = {
              source: $source.editable('getOriginalText'),
              target: $target.editable('getText'),
              validated_words: validated_words, 
            }
            itp.getConfidences(query);
          }
        }
      }

      function shouldUpdate($elem, opt, value) {
        if (typeof value === "undefined") value = true;
        var old = ($elem[0].getAttribute("data-" + opt) === "true")
        return value === true && old === false; 
      }

      function toggleOpt($elem, opt, value) {
        var elem = $elem.get(0);
        if (typeof value === "undefined") {
          value = (elem.getAttribute("data-" + opt) !== "true");
        }
        elem.setAttribute("data-" + opt, value);
        return value
      }

      $target.on('displayShadeOffTranslatedSourceToggle' + nsClass, function(e, value) {
        var cfg = userCfg(), update = shouldUpdate($target, "opt-shade-off-translated", value);
        cfg.displayShadeOffTranslatedSource = toggleOpt($target, "opt-shade-off-translated", value);
        toggleOpt($source, "opt-shade-off-translated", cfg.displayShadeOffTranslatedSource);
        if (update) {
          updateAlignments();
        }
        $target.trigger('togglechange', ['displayShadeOffTranslatedSource', cfg.displayShadeOffTranslatedSource, cfg]);
      })
      .on('displayCaretAlignToggle' + nsClass, function(e, value) {
        var cfg = userCfg(), update = shouldUpdate($target, "opt-caret-align", value);
        cfg.displayCaretAlign = toggleOpt($target, "opt-caret-align", value);
        toggleOpt($source, "opt-caret-align", cfg.displayCaretAlign);
        if (update) {
          updateAlignments();
          $target.one('alignments', function() {
            $target.editable('refreshCaret');
          });
        }
        $target.trigger('togglechange', ['displayCaretAlign', cfg.displayCaretAlign, cfg]);
      })
      .on('displayMouseAlignToggle' + nsClass, function(e, value) {
        var cfg = userCfg(), update = shouldUpdate($target, "opt-mouse-align", value);
        cfg.displayMouseAlign = toggleOpt($target, "opt-mouse-align", value);
        toggleOpt($source, "opt-mouse-align", cfg.displayMouseAlign);
        if (update) updateAlignments();
        $target.trigger('togglechange', ['displayMouseAlign', cfg.displayMouseAlign, cfg]);
      })
      .on('displayConfidencesToggle' + nsClass, function(e, value) {
        var cfg = userCfg(), update = shouldUpdate($target, "opt-confidences", value);
        if (value === true && cfg.displayConfidences === false) update = true;
        cfg.displayConfidences = toggleOpt($target, "opt-confidences", value);
        toggleOpt($source, "opt-confidences", cfg.displayConfidences);
        if (cfg.displayConfidences) { 
          if (update) updateConfidences();
        }
        else {
          $('.editable-token', $target).each(function(){
            var $this = $(this);
            $this.attr('title', '');
          });
        }
        $target.trigger('togglechange', ['displayConfidences', cfg.displayConfidences, cfg]);
      })
      .on('highlightValidatedToggle' + nsClass, function(e, value) {
        var cfg = userCfg();
        cfg.highlightValidated = toggleOpt($target, "opt-validated", value);
        toggleOpt($source, "opt-validated", cfg.highlightValidated);
        $target.trigger('togglechange', ['highlightValidated', cfg.highlightValidated, cfg]);
      })
      .on('highlightLastValidatedToggle' + nsClass, function(e, value) {
        var cfg = userCfg();
        cfg.highlightLastValidated = toggleOpt($target, "opt-last-validated", value);
        $target.trigger('togglechange', ['highlightLastValidated', cfg.highlightLastValidated, cfg]);
      })
      .on('highlightPrefixToggle' + nsClass, function(e, value) {
        var cfg = userCfg();
        cfg.highlightPrefix = toggleOpt($target, "opt-prefix", value);
        toggleOpt($source, "opt-prefix", cfg.highlightPrefix);
        $target.trigger('togglechange', ['highlightPrefix', cfg.highlightPrefix, cfg]);
      })
      .on('highlightSuffixToggle' + nsClass, function(e, value) {
        var cfg = userCfg();
        cfg.highlightSuffix = toggleOpt($target, "opt-suffix", value);
        toggleOpt($source, "opt-suffix", cfg.highlightSuffix);
        $target.trigger('togglechange', ['highlightSuffix', cfg.highlightSuffix, cfg]);
      })
      .on('limitSuffixLengthToggle' + nsClass, function(e, value) {
        var cfg = userCfg();
        cfg.limitSuffixLength = toggleOpt($target, "opt-limit-suffix-length", value);
        toggleOpt($source, "opt-limit-suffix-length", cfg.limitSuffixLength);
        $target.trigger('togglechange', ['limitSuffixLength', cfg.limitSuffixLength, cfg]);
      });

      function tabKeyHandler(e, mode) {
        var ui = userCfg(), $token, gotoEnd = false;

        if (window.config.floatPredictions) {
          // when we use floating predictions, the semantics of the tab key change
          if (mode === 'fwd')
            self.vis.FloatingPrediction.acceptNextWord();
          return;
        }

        // find next token 
        if (mode == 'fwd') {
          // if we have a prioritizer, we rely on the representation and find the first greyed out token 
          if (ui.prioritizer != 'none' && ui.limitSuffixLength) {
            $token = $('.editable-token', $target).filter(function(e){ return this.dataset.limited === "true" && this.dataset.prefix !== "true";}).first();
          }
          // if we don't have prioritizer, we find the token next to the caret position 
          if (ui.prioritizer === 'none' || !$token || $token.length === 0) {
          //else {
            //if (self.currentCaretPos && self.currentCaretPos.token) {
            //$token = $(self.currentCaretPos.token.elem);
            var tokenPos = $target.editable('getTokenAtCaret');
            $token = $(tokenPos.elem);
            if ($token) {
              if ($token.parent().is('.editable-token')) {
                $token = $token.parent();
              }
              $token = $token.next('.editable-token');
              // move to the next token editable if we are at the end of a token and the next token is pasted
              // since we assume we are already at the beginning of the next token 
              if (tokenPos.elem.nodeValue.length - tokenPos.pos === 0 &&
                  tokenPos.elem.nextSibling && tokenPos.elem.nextSibling.nodeType === 3 && tokenPos.elem.nextSibling.nodeValue.length === 0)
              {
                $token = $token.next('.editable-token');
              }
            }
          }
          if (!$token || !$token.length) gotoEnd = true; 
          // if this is the last token go to end
          //var $next = $token.next('.editable-token');
          //if ($token && $token.length && !$next.length) {
          //  gotoEnd = true;
          //}
          //$token = $next;
        }
        // find previous token 
        else {
          var tokenPos = $target.editable('getTokenAtCaret');
          if (tokenPos.elem) {
            $token = $(tokenPos.elem);
            
            // $token is editable 
            if ($token.parent().is('.editable-token')) {
              $token = $token.parent();
              if (tokenPos.pos === 0) {
                $token = $token.prev('.editable-token');
              }
            }
            // elem is non-token (space) 
            else {
              var elem = tokenPos.elem;
              while (elem && elem.nodeType === 3) {
                elem = elem.previousSibling;
              }
              $token = $(elem);
            }
          }
        }

        if ($token && $token.length) {
          $target.editable('setCaretAtToken', $token.get(0));
        } 
        else if (gotoEnd) {
          $target.editable('setCaretPos', $target.text().length);
        }
      };
      
      var sourceOptions = $source.data('editable').options;
      if (!sourceOptions.disabled) {
        // #source events
        // on key up throttle a new translation
        $source.bind('keyup' + nsClass, function(e) {
          var $this = $(this),
              data = $this.data('editable'),
              source = $this.editable('getText');
  
       
          if (userCfg().mode == 'ITP' && window.config.floatPredictions) {
            self.vis.FloatingPrediction.setPredictedText (null);
          }
          if (doesTriggerInteraction(e)) {
            throttle(function() {
              if (data.str !== source) {
                var query = {
                  source: source,
                  //num_results: 2,
                }
                itp.decode(query);
              }
            }, throttle_ms);
          }
        })
        .bind('change' + nsClass, function(e){
          itp.startSession({source: $source.editable('getText')});
        });
      }

      if (userCfg().mode == 'ITP' && window.config.floatPredictions) {
        $(window).scroll (function () {
          self.vis.FloatingPrediction.adjustPosition();
        });
      }
    
      self.typedWords = {};
      self.currentCaretPos; // { pos, token }

      function forgetState(caretPos) {
        // IF "implicit reject on click" AND "cursor pos has chaged": invalidate previous states
        if (typeof self.currentCaretPos != 'undefined' && caretPos !== self.currentCaretPos.pos) {
          self.mousewheel.invalidate(true);
        }
      };
            
      // caretmove is a new event from jquery.editable that is triggered
      // whenever the caret has changed position
      $target.bind('caretmove' + nsClass, function(e, d) {
        //var text = $(this).text();
        //$('#caret').html('<span class="prefix">' + text.substr(0, d.pos) + '</span>' + '<span class="suffix">' + text.substr(d.pos) + "</span>");
        forgetState(d.pos);
        self.currentCaretPos = d;
        if (userCfg().mode == 'ITP' && window.config.floatPredictions) {
          self.vis.FloatingPrediction.adjustPosition();
        }
      })
      // on ctrl+click reject suffix 
      .bind('click' + nsClass, function(e) {
        var cpos = $target.editable('getCaretPos');
        forgetState(cpos);
        // Update only the caret position
        if (self.currentCaretPos)
          // 2013-11-28 - herve - added the 'if' condition -- I was getting "self.currentCaretPos is undefined" errors here
          self.currentCaretPos.pos = cpos;
        // Issue a reject only if CTRL is pressed
        if (e.ctrlKey) reject(); // UPDATE: This is error prone and may require interaction with other modules
      })
      // on keyup throttle a new translation
      .bind('keyup' + nsClass, function(e) {
        var conf = userCfg();
        // XXX: if (true) { // also update in PE to update tokenization and validated tokens || conf.mode != 'PE') {
        if (conf.mode != 'PE') {
          var $this = $(this),
              data = $this.data('editable'),
              target = $this.editable('getText'),
              source = $source.editable('getOriginalText'),
              pos = $target.editable('getCaretPos');

          var spanElem = $target.editable('getTokenAtCaretPos', pos).elem;
          if (spanElem && spanElem.parentNode && $(spanElem.parentNode).is('.editable-token')) {
            spanElem = spanElem.parentNode;
          }
          var suffixHasUserCorrections = $(spanElem).nextAll('.editable-token').filter(function(index, elem){ return elem.dataset.validated === "true"; });
 
          var targetId = $(spanElem).attr('id');
          // Remember interacted words only when the user types in the right span
          var numInStr = targetId ? targetId.match(/(\d+)$/) : null;
          if (numInStr && parseInt(numInStr[0], 10)) {
            self.typedWords[ $(spanElem).attr('id') ] = true;
          }
          
          if (doesTriggerInteraction(e)) {
            throttle(function () {
              if (data.str !== target) {
                // Predict from last edited token onwards
                $target.find('span').each(function(i, elem){
                  // TODO
                });
                var query = {
                  source: source,
                  target: target,
                  caretPos: pos,
                  numResults: 1
                }
                var itpCfg = cfg(), itp = itpCfg.itpServer;
                var isDraft = ($this.closest('section.status-draft').length);
                if (suffixHasUserCorrections.length === 0 && conf.mode != 'PE' && (isDraft || !config.itpDraftOnly)) {
                  console.log("setPrefix");
                  itp.setPrefix(query);
                }
                else {
                  itp.getTokens(query);
                }
              }
            }(suffixHasUserCorrections.length === 0 && conf.mode != 'PE'), throttle_ms);
          }
        }
      });
    }
   
  };

  module.exports = ItpEvents; 

})('object' === typeof module ? module : {}, this);
