// -*- js-indent-level: 2 -*-

(function(module, global){
  var NLP = require('nlp-utils');

  // singleton instance of the FloatingPrediction 'class'
  var floatingPredItpVis;

  /*******************************************************************************/
  /*           update the HTML display and attach events                         */
  /*******************************************************************************/

  var ItpVisualization = function($target, namespace, nsClass, config) {
    var self = this;

    function cfg()     { return $target.data(namespace); }
    function userCfg() { return cfg().config; }
    function $source() { return $target.data(namespace).$source; }

    if (config.hasOwnProperty('caretAlignBackground')) { 
      $("<style type='text/css'> .caret-align { background: " + config.caretAlignBackground + " !important; } </style>").appendTo("head");
    }
    if (config.hasOwnProperty('mouseAlignBackground')) { 
      $("<style type='text/css'> .mouse-align { background: " + config.mouseAlignBackground + " !important; } </style>").appendTo("head");
    }


    self.updateValidated = function(caretPos) {
      if (caretPos) {
        var tokenAtPos = $target.editable('getTokenAtCaretPos', caretPos);
        if (tokenAtPos) {
          var lastEditedToken = tokenAtPos.elem;
          if (lastEditedToken.parentNode && $(lastEditedToken.parentNode).is('.editable-token')) {
            lastEditedToken = lastEditedToken.parentNode;
          }

          if (tokenAtPos.pos === 0) {
            if (lastEditedToken.nodeType === 3) {
              lastEditedToken = lastEditedToken.previousSibling;
            }
            else {
              var $lastEditedToken = $(lastEditedToken).prev('.editable-token');
              if ($lastEditedToken.length > 0) {
                lastEditedToken = $lastEditedToken.get(0);
              }
              else {
                lastEditedToken = undefined;
              }
            }
          }

          var $lastEditedToken = $(lastEditedToken);
          if (lastEditedToken && lastEditedToken.dataset) {
            // XXX: do not use jquery data if you want css selectors to work
            lastEditedToken.dataset.validated = true;
            $lastEditedToken.prevAll(".editable-token").each(function(i, elem) {
              // if the element in the prefix has been inserted, then it must have been introduced by the user 
              var $elem = $(elem);
              if ($elem.data('merge-type') !== 'N') {
                elem.dataset.validated = true;
              }
            });
            var $next = $lastEditedToken.next();
            var nself = $next.get(0);
            if ($next.data('merge-type') !== 'N' && nself && nself.dataset.validated === "true") {
              $next.attr('data-last-validated', false).attr('data-validated', false);
            }
            
            var $lastValidated = $lastEditedToken.nextAll('.editable-token[data-validated=true]').last();
            if (!$lastValidated || $lastValidated.length === 0)  {
              $lastValidated = $lastEditedToken;
            }
            $lastValidated.attr('data-last-validated', true);

            $lastValidated.prevAll(".editable-token").each(function(i, elem) {
              elem.removeAttribute('data-last-validated');
            });
            $lastValidated.prevAll(".editable-token").andSelf().each(function(i, elem) {
              elem.dataset.prefix = true;
              delete elem.dataset.suffix;
            });
            $lastValidated.nextAll(".editable-token").each(function(i, elem) {
              delete elem.dataset.prefix;
              elem.dataset.suffix = true;
            });
          }
        }
      }
    }

    // requests the server for new alignment and confidence info
    self.updateOptional = function(match) {
      var validated_words = $('.editable-token', $target).map(function() { return (this.dataset.validated)?true:false; }).get();
      var query = {
        source: match.source,
        target: match.target,
        validated_words: validated_words, 
      }
      var conf = userCfg(), itp = cfg().itpServer;
      if (conf.useAlignments && (conf.displayCaretAlign || conf.displayMouseAlign || conf.displayShadeOffTranslatedSource)) {
        if (match.alignments) {
          itp.trigger('getAlignmentsResult', {data: match, errors: []});
        }
        else {
          itp.getAlignments(query);
        }
      }
      if (conf.useConfidences && conf.displayConfidences) {
        if (match.confidences) {
          itp.trigger('getConfidencesResult', {data: match, errors: []});
        }
        else {
          itp.getConfidences(query);
        }
      }
    }

    self.updateSuggestions = function(data) {
      var d = $target.editable('getCaretXY')
        , targetPrefix = $target.editable('getText').substr(0, d.pos)
        , conf = userCfg()
        ;
          
      if (!data || !data.nbest) return;

      $source().editable('setText', data.source, data.sourceSegmentation);

      for (var i = 0; i < data.nbest.length; i++) {
        var match = data.nbest[i];
        // XXX: If prediction came from click in the middle of a token, then the
        // sentence is not updated; since the following condition does not match:
        // The prefix in the sentence does not match the prefix in the prediction.
        var matchPrefix = match.target.substr(0, d.pos);
        if (conf.mode == "TOUCH" || (targetPrefix === matchPrefix && (!match.author || conf.mode === match.author))) {
          var doUpdate = true;

          if (conf.avoidLowConfidencePredictions) {
            var quality = parseInt(match.quality * 100);
            var percentageClass = UI.getPercentuageClass(quality);
            console.log('PERCENT', percentageClass, $('#' + $(UI.currentSegment).attr("id") + '-header .percentuage'));
            $('#' + $(UI.currentSegment).attr("id") + '-header .percentuage').text(quality).removeClass('per-orange per-green per-blue per-yellow').addClass(percentageClass).addClass('visible');

            if (quality < 100*conf.confidencePredictionThreshold) doUpdate = false;
          }

          if (doUpdate) {
            $target.editable('setText', match.target, match.targetSegmentation);

            self.updateValidated(data.caretPos);

            if (match.priorities) {
              self.updateWordPriorities($target, match.priorities);
            }

            // requests the server for new alignment and confidence info
            var nmatch = $.extend({source: data.source, sourceSegmentation: data.sourceSegmentation}, match);
            self.updateOptional(nmatch);
          }
          break;
        }
      }
    }

    // updates the translation display and queries for new alignments and word confidences
    self.updateTranslationDisplay = function(data) {
      // getTokens doesn't have nbest, so this check is required
      var bestResult = data.nbest ? data.nbest[0] : data;
      var source     = data.source,
          sourceSeg  = data.sourceSegmentation,
          target     = bestResult.target,
          targetSeg  = bestResult.targetSegmentation;
      
      // sets the text in the editable div. It tokenizes the sentence and wraps tokens in spans
      $source().editable('setText', source, sourceSeg);
      $target.editable('setText', target, targetSeg);

      self.updateValidated(data.caretPos);

      // requests the server for new alignment and confidence info
      self.updateOptional(bestResult);
    }


    // get the aligned html ids for source and target tokens
    self.getAlignmentIds = function(alignments, sourcespans, targetspans) {
      if (alignments.length !== sourcespans.length || alignments[0].length !== targetspans.length) {
        console.warn("Alignments do not match!!!", alignments.length, "=", sourcespans.length, ", ", alignments[0].length, "=", targetspans.length, alignments, sourcespans, targetspans); 
        return;
      }

      // sourceal stores ids of target spans aligned to it
      var sourceal = [];
      sourceal.length = alignments.length;
      for (var c = 0; c < alignments.length; ++c) sourceal[c] = [];

      // targetal stores ids of source spans aligned to it
      var targetal = [];
      targetal.length = alignments[0].length;
      for (var v = 0; v < alignments[0].length; ++v) targetal[v] = [];
      
      for (var c = 0; c < sourceal.length; ++c) {
        var alignment = alignments[c];          
        for (var v = 0; v < targetal.length; ++v) {
          if (alignment[v] > 0.5) {
            sourceal[c].push('#' + targetspans[v].id);
            targetal[v].push('#' + sourcespans[c].id);

            var s = $('#' + sourcespans[c].id).get(0);
            var t = $('#' + targetspans[v].id).get(0);
            if (s && t && t.dataset.prefix) s.dataset.prefix = true;
            if (s && t && t.dataset.validated) s.dataset.validated = true;
          }
        }
      }
      
      return {sourceal: sourceal, targetal: targetal};	  	
    }

    
    self.showAlignments = function(aligs, classname) {
      for (var j = 0; j < aligs.length; j++) {
        $(aligs[j]).toggleClass(classname, true);
      }
    }

    self.hideAlignments = function(aligs, classname) {
      for (var j = 0; j < aligs.length; j++) {
        $(aligs[j]).toggleClass(classname, false);
      }
    }


    // add alignment events so that aligned words are highlighted
    self.addAlignmentEvents = function($node, spans, aligids) {
      // add mouseenter mouseleave events to token spans
      for (var i = 0; i < spans.length; i++) {
        var $span = $(spans[i]);
        var data = $span.data('alignments');
        if (!data) {
          $span.off('.alignments');
          $span.on('mouseenter.alignments', function (e) {
            var aligs = $(e.target).data('alignments').alignedIds;
            self.showAlignments(aligs, 'mouse-align');
	    $(this).toggleClass('mouse-align',true);
          });
          $span.on('mouseleave.alignments', function (e) {
            var aligs = $(e.target).data('alignments').alignedIds;
            self.hideAlignments(aligs, 'mouse-align');
	    $(this).toggleClass('mouse-align',false);
          });
        }
        else {
          $span[0].removeEventListener('DOMNodeRemoved', data.onremove, false);
        }
        data = { alignedIds: aligids[i] };
        data.onremove = function(alignedIds) { 
          return function(e) { self.hideAlignments(alignedIds, 'mouse-align caret-align'); }
        }(data.alignedIds);

        $span[0].addEventListener('DOMNodeRemoved', data.onremove, false);
        $span.data('alignments', data);
      } 
    }

    self.updateShadeOffTranslatedSource = function() {
      $target.trigger('updateShadeOffTranslatedSource');
      console.log("updateShadeOffTranslatedSource");
      var transopt_id_prefix = "#" + $(UI.currentSegment).attr("id") + "-translation-option-input-";
      var sourcespans = $('.editable-token', $source());
      var targetspans = $('.editable-token', $target);

      // not used -> clear out annotation
      if (! (userCfg().useAlignments && userCfg().displayShadeOffTranslatedSource)) {
        console.log("everything false");
        for (var i = 0; i < sourcespans.length; i++) {
          $(sourcespans[i]).toggleClass('shade-off-translated', false);
          $(sourcespans[i]).toggleClass('shade-off-next', false);
          if (window.config.translationOptions && $(transopt_id_prefix + i)) { // also in translation option display
            $(transopt_id_prefix + i).toggleClass('shade-off-translated', false);
            $(transopt_id_prefix + i).toggleClass('shade-off-next', false);
          }
        }
        return;
      }

      if (! $target.data.alignments) {
        console.log("there are no alignments");
        return;
      } 
      else if (sourcespans.length != $target.data.alignments.length || 
             targetspans.length != $target.data.alignments[0].length) {
        return;
      }
      // get span tokens 
      var last_covered = -1;
      for (var i = 0; i < targetspans.length; i++) {
         if ($('#'+targetspans[i].id).text() != "") {
           last_covered = i;
         }
      }
      console.log("last covered: " + last_covered);
      // loop over source words
      var previous_covered_by_any = false;
      var previous_covered_by_next = false;
      for (var s=0; s<$target.data.alignments.length; s++) {
        var covered_by_any = false;
        var covered_by_next = false;
        var log_aligned = "";
        for (var t=0; t<$target.data.alignments[s].length && t<=last_covered+1; t++) {
          if ($target.data.alignments[s][t]) {
            if (t == last_covered+1) {
              covered_by_next = true;
            }
            else {
              covered_by_any = true;
            }
            log_aligned += " " + $('#'+targetspans[t].id).text()
          }
        }
        if (covered_by_any || covered_by_next) { 
          console.log($(sourcespans[s]).text() + " --- " + log_aligned);
        }
        if (covered_by_next) { covered_by_any = false; }

        // got all the information, let's color some input tokens
        $(sourcespans[s]).toggleClass('shade-off-translated', covered_by_any);
        $(sourcespans[s]).toggleClass('shade-off-next', covered_by_next);
        if (s>0) { // also the spaces between them
          $('#'+sourcespans[s-1].id+"-space").toggleClass('shade-off-translated', previous_covered_by_any && covered_by_any);
          $('#'+sourcespans[s-1].id+"-space").toggleClass('shade-off-next', (previous_covered_by_next || previous_covered_by_any) && covered_by_next);
        }

        // shade and scroll translation option display
        if (window.config.translationOptions 
            && $(transopt_id_prefix + s) 
            && $(transopt_id_prefix + s).offset()) {
          if (covered_by_next) { // move display to show next in center
            var currentFocusWordPosition = $(transopt_id_prefix + s).offset().left;
            var move = currentFocusWordPosition - window.innerWidth * 0.4;
            var currentScrollPosition = $("#" + $(UI.currentSegment).attr("id") + "-options").scrollLeft();
            var scrollToPosition = currentScrollPosition + move;
            if (scrollToPosition < 0) { scrollToPosition = 0; }
            $("#" + $(UI.currentSegment).attr("id") + "-options").scrollLeft( scrollToPosition )
          }
          $(transopt_id_prefix + s).toggleClass('shade-off-translated', covered_by_any);
          $(transopt_id_prefix + s).toggleClass('shade-off-next', covered_by_next);
        }
        previous_covered_by_next = covered_by_next;
        previous_covered_by_any = covered_by_any;
      }
    }

    // updates the alignment display with new alignment info      
    self.updateAlignmentDisplay = function(data) {
      var conf = userCfg();
      var alignments = data.alignments
        , source = data.source
        , sourceSegmentation = data.sourceSegmentation
        , target = data.target
        , targetSegmentation = data.targetSegmentation;

      // make sure new data still applies to current text
      if (!(alignments.length > 0 && alignments[0].length > 0)) return;
      if (source !== $source().editable('getText')) return;
      if (!window.config.floatPredictions && target !== $target.editable('getText')) return;
      if ( window.config.floatPredictions && target != self.FloatingPrediction.getPredictedText()) return;
      $target.data.alignments = alignments;

      // get span tokens 
      var sourcespans = $('.editable-token', $source());
      var targetspans = $('.editable-token', $target);
  
      var aligids = self.getAlignmentIds(alignments, sourcespans, targetspans);  
      if (aligids) {
        // sourceal stores ids of target spans aligned to it
        var sourceal = aligids.sourceal;
        var targetal = aligids.targetal;

        // add mouseenter mouseleave events to source spans
        self.addAlignmentEvents($source(), sourcespans, sourceal);

        // add mouseenter mouseleave events to target spans
        self.addAlignmentEvents($target, targetspans, targetal);

        // update shade off of translated source
        self.updateShadeOffTranslatedSource();
      }
    }


    self.updateWordPriorities = function($target, priorities) {
      $('.editable-token', $target).each(function(index) {
        $(this).data('priority', priorities[index]);
      });

      var caretTok = $target.editable('getTokenAtCaret');
      if (caretTok.elem) {
        var $currentToken = $(caretTok.elem);
        self.updateWordPriorityDisplay($target, $currentToken);
      }
    }

    self.updateWordPriorityDisplay = function($target, $token) {
      // get target span tokens 
      var $spans = $('.editable-token', $target)
        , userPriorityLength = userCfg().priorityLength
        ;

      if ($token.parent().is('.editable-token')) {
        $token = $token.parent();
      }
      else {
        while (!$token.is('.editable-token') && $token[0].previousSibling) {
          $token = $($token[0].previousSibling);
        }
      }

      var $lastValidated = $token.nextAll('.editable-token[data-last-validated=true]').first();
      if ($lastValidated.length) {
        $token = $lastValidated;
      }

      var currentPriority = $token.data('priority');
      var $firstLimited = $token.nextAll('.editable-token').filter(function() { 
        var priority = $(this).data('priority');
        return priority > 0 && priority >= currentPriority + userPriorityLength; 
      }).first();
      if ($firstLimited && $firstLimited.length) { 
        $firstLimited.prevAll('.editable-token').each(function() {
          delete this.dataset.limited;
        });
        $firstLimited.nextAll('.editable-token').andSelf().each(function() {
          this.dataset.limited = true;
        });
      }
      else {
        $token.prevAll('.editable-token').nextAll('.editable-token').each(function() {
          delete this.dataset.limited;
        });
      }
    }
 
    // updates the confidence display with new confidence info      
    self.updateWordConfidencesDisplay = function(data) {
      var sent = data.quality
        , confidences = data.confidences
        , source = data.source
        , sourceSegmentation = data.sourceSegmentation
        , target = data.target
        , targetSegmentation = data.targetSegmentation
        , confThreshold = userCfg().confidenceThresholds
        ;

      // make sure new data still applies to current text
      if (source !== $source().editable('getText')) return;
      if (target !== $target.editable('getText')) return;

      // get target span tokens 
      var spans = $('.editable-token', $target);
      // add class to color tokens 'wordconf-ok', 'wordconf-doubt' or 'wordconf-bad'
      for (var c = 0; c < confidences.length; ++c) {
        var $span = $(spans[c]), conf = Math.round(confidences[c]*100)/100, cssClass;
        if (conf > confThreshold.doubt /*|| typedWords.hasOwnProperty($span.attr("id"))*/) {
          cssClass = "wordconf-ok";
        }
        else if (conf > confThreshold.bad) {
          cssClass = "wordconf-doubt";
        }
        else if (conf == 0) {
          cssClass = "wordconf-unknown";
        }
        else {
          cssClass = "wordconf-bad";
        }

        $span.data('confidence', conf)
             .removeClass("wordconf-ok wordconf-doubt wordconf-bad")
             .addClass(cssClass);

        if ($target.options.debug && userCfg().displayConfidences) {
          $span.attr('title', 'conf: ' + Math.round(conf*100));
        }

      }
    }

    /////////////////////////////////////////////////////////////////////////
    // the "floating prediction" displays the predicted next word next to the
    // user's text caret
    self.FloatingPrediction = (function () {
      var NUM_WORDS_LOOKAHEAD = 3;
      var visibility = {
        havePixelCoord: false,
        preconditionsMet: false,
        haveText: false
      };

      if (floatingPredItpVis)
        // there can only be one
        floatingPredItpVis.FloatingPrediction.destroy();
      floatingPredItpVis = self;

      var elFloatPred = document.createElement ('div');
	  elFloatPred.id = 'el-float-pred';
      document.body.appendChild (elFloatPred);

      var predictedText = null;
      var predictedSegmentation = [];
      setPredictedText(null);

      function getCaretPixelCoords () {
        // returns the X/Y coordinates, in fixed window pixels, of the text
        // caret
        // 
        // note: does not use getCaretXY() from jquery.editable.js 
        //       because that is unreliable
        var sel = document.selection;
        var x = 0, y = 0;
        var range;
        if (sel) {
          if (sel.type != "Control") {
            range = sel.createRange();
            range.collapse(true);
            x = range.boundingLeft;
            y = range.boundingTop;
          }
        } else if (window.getSelection) {
          sel = window.getSelection();
          if (sel.rangeCount) {
            range = sel.getRangeAt(0).cloneRange();
            if (range.getClientRects) {
              range.collapse(true);
              var rect = range.getClientRects()[0];
              x = rect && rect.left;
              y = rect && rect.top;

              // Fall back to inserting a temporary element
              // http://stackoverflow.com/questions/6846230/coordinates-of-selected-text-in-browser-page
              if (x == undefined) {
                var span = document.createElement("span");
                if (span.getClientRects) {
                  // Ensure span has dimensions and position by
                  // adding a zero-width space character
                  span.appendChild( document.createTextNode("\u200b") );
                  range.insertNode(span);
                  rect = span.getClientRects()[0];
                  x = rect.left;
                  y = rect.top;
                  var spanParent = span.parentNode;
                  spanParent.removeChild(span);

                  // Glue any broken text nodes back together
                  spanParent.normalize();
                }
              }
            }
          }
        }
        return typeof x === 'number' && typeof y === 'number'
              ? [parseInt(x),parseInt(y)] : null;
      }

      function adjustPosition () {
        var coord = getCaretPixelCoords();
        visibility.havePixelCoord = true; // always true -> reuse old
        if (coord && coord[0] && coord[1]) {
          drawTextBox( elFloatPred.innerHTML, getVisible(), (coord[0]+10) + 'px', (coord[1]+20) + 'px');
          //elFloatPred.style.top  = (coord[1]+20) + 'px';
          //elFloatPred.style.left = (coord[0]+10) + 'px';
          //showPredictedText();
        } 
      }

      function skip (regex, pos, txt) {
        if (typeof txt === 'undefined')
          txt = predictedText;
        while (pos < txt.length && regex.test(txt[pos]))
          pos++;
        return pos;
      }

      function skipBack (regex, pos, txt) {
        if (typeof txt === 'undefined')
          txt = predictedText;
        while (pos > 0 && regex.test(txt[pos-1]))
          pos--;
        return pos;
      }

      function getVisible () {
        var conf = userCfg();
        var visible = (conf.mode == 'ITP');
        for (var cond in visibility)
          if (visibility.hasOwnProperty(cond) && !visibility[cond]) {
            //console.log("cond " + cond + " failed.");
            visible = false;
          }
        return visible;
      }

      function setPredictedText (data) {
        if (data == null) {
          predictedText = null;
          predictedSegmentation = [];
        }
        else {
          predictedText = data.nbest[0].target;
          predictedSegmentation = data.nbest[0].targetSegmentation;

          // update token information (includes predicted suffix)
          $target.editable('setText', $target.editable('getText'), predictedSegmentation);

          // request the server for new alignment and confidence info
          var nmatch = $.extend({source: data.source, sourceSegmentation: data.sourceSegmentation}, data.nbest[0]);
          self.updateOptional(nmatch);
        }
        adjustPosition();
        showPredictedText();
      }

      function getPredictedText () {
        return predictedText;
      }

      function showPredictedText () {
        if (!$target.editable('hasFocus')) {
          visibility.preconditionsMet = false;
          drawTextBox( "", false, elFloatPred.style.left, elFloatPred.style.top);
          return;
        }
        var txt = predictedText;
        var floatHtmlStr;
        if (txt) {
          var caretPos = $target.editable('getCaretPos');
          var userInput = $target.editable('getText');
          if (userInput && (
              userInput.length < caretPos
              || txt.length < caretPos
              || userInput.length >= txt.length
              || userInput.substring(0,caretPos) != txt.substring(0,caretPos)
              )) {
            console.log("preconditionsMet = false");
            visibility.preconditionsMet = false;
            drawTextBox( "", false, elFloatPred.style.left, elFloatPred.style.top);
            return;
          }
          var boldStart = skip(/^\s/, caretPos);
          var predStart = skipBack (/^\S/, skip (/^\s/, boldStart));
          var boldEnd = skip (/^\S/, boldStart);
          var predEnd = predStart;
          // predStart = skip (/^\s/, predStart);
          for (var word = 0; word < NUM_WORDS_LOOKAHEAD; word++)
            predEnd = skip (/^\S/, skip (/^\s/, predEnd));
          floatHtmlStr = 
              txt.substring (predStart, boldStart) +
              '<b>' + 
              txt.substring (boldStart, boldEnd) +
              '</b>' +
              txt.substring (boldEnd, predEnd);
        }
        else {
          // spinner if no prediction so far
          floatHtmlStr = "<img src=\"/public/img/loader.gif\" width=\"16\" height=\"16\">";
        }
        //if (floatHtmlStr) {
        //  elFloatPred.innerHTML = floatHtmlStr;
        //}
        visibility.preconditionsMet = true;
        visibility.haveText = !!floatHtmlStr;
        drawTextBox( floatHtmlStr, getVisible(), elFloatPred.style.left, elFloatPred.style.top);
      }

      function drawTextBox( text, visible, x, y) {
        console.log("drawTextBox " + text + ", vis " + visible + ", x=" + x + ", y=" + y);
        elFloatPred.innerHTML = text;
        elFloatPred.className = 'floating-prediction'
            + (visible ? '' : ' floating-prediction-hidden');
        elFloatPred.style.left = x;
        elFloatPred.style.top  = y;
        $target.trigger('floatPredictionShow',[[text, visible, x, y]]);
      }

      function goToPos (pos) {
        // I thought this would be enough:
        //   $target.editable ('setCaretPos', $target.text().length);
        // but I can't get it to work. (Herve)
        // The following works for me (Phi)
        $target.editable ('setCaretPos', pos);
	// Herve's code:
        //var token = $target.editable ('getTokenAtCaret', 0);
        //var range = document.createRange();
        //range.setStart (token.elem, pos);
        //range.collapse();
        //var sel = window.getSelection();
        //sel.removeAllRanges();
        //sel.addRange (range);
      }

      function acceptNextWord () {
        if (!predictedText)
          return;
        var pos = $target.editable('getCaretPos');
        var oldText = $target.text();
        var insText = predictedText.substring(pos).replace (/(\S)\s.*/,'$1');
        var sufText = oldText.substring (pos);
        if (sufText.indexOf(insText) === 0)
          sufText = sufText.substring(insText.length).trim();
	// no double space
	if (pos>0 && oldText.substring(pos-1,pos) == ' ' && insText.substring(0,1) == ' ') {
	  insText = insText.substring(1);
	}
        var newText = oldText.substring (0, pos) + insText + ' ' + sufText;
        $target.editable ('setText', newText, predictedSegmentation);
        $target.trigger('floatPredictionAccept',[insText]);        
        // $target.editable ('setText', newText);
        goToPos (pos + insText.length + 1);
        showPredictedText();
        self.updateShadeOffTranslatedSource();
        // merc - adding trigger to float predictions   
      }

      function destroy () {
        elFloatPred.parentNode.removeChild (elFloatPred);
      }

      // public methods for FloatingPrediction
      return {
        drawTextBox: drawTextBox,
        adjustPosition: adjustPosition,
        setPredictedText: setPredictedText,
        getPredictedText: getPredictedText,
        acceptNextWord: acceptNextWord,
        destroy: destroy
      };
    })();
  };
  
  module.exports = ItpVisualization; 

})('object' === typeof module ? module : {}, this);
