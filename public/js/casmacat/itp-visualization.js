// -*- js-indent-level: 2 -*-

(function(module, global){
  var NLP = require('nlp-utils');

  /*******************************************************************************/
  /*           update the HTML display and attach events                         */
  /*******************************************************************************/

  var ItpVisualization = function($target, namespace, nsClass) {
    var self = this;

    function cfg()     { return $target.data(namespace); }
    function userCfg() { return cfg().config; }
    function $source() { return $target.data(namespace).$source; }

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
            });
            $lastValidated.nextAll(".editable-token").each(function(i, elem) {
              delete elem.dataset.prefix;
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
      if (conf.useAlignments && (conf.displayCaretAlign || conf.displayMouseAlign)) {
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
        if (targetPrefix === matchPrefix && (!match.author || conf.mode === match.author)) {
          $target.editable('setText', match.target, match.targetSegmentation);

          self.updateValidated(data.caretPos);

          if (match.priorities) {
            self.updateWordPriorities($target, match.priorities);
          }
        
          // requests the server for new alignment and confidence info
          var nmatch = $.extend({source: data.source, sourceSegmentation: data.sourceSegmentation}, match);
          self.updateOptional(nmatch);
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
          });
          $span.on('mouseleave.alignments', function (e) {
            var aligs = $(e.target).data('alignments').alignedIds;
            self.hideAlignments(aligs, 'mouse-align');
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

    // updates the alignment display with new alignment info      
    self.updateAlignmentDisplay = function(data) {
      var alignments = data.alignments
        , source = data.source
        , sourceSegmentation = data.sourceSegmentation
        , target = data.target
        , targetSegmentation = data.targetSegmentation
        ;

      // make sure new data still applies to current text
      if (!(alignments.length > 0 && alignments[0].length > 0)) return;
      if (source !== $source().editable('getText')) return;
      if (target !== $target.editable('getText')) return;

      // get span tokens 
      var sourcespans = $('.editable-token', $source());
      var targetspans = $('.editable-token', $target);
    
      var aligids = self.getAlignmentIds(alignments, sourcespans, targetspans);  

      // sourceal stores ids of target spans aligned to it
      var sourceal = aligids.sourceal;
      var targetal = aligids.targetal;

      // add mouseenter mouseleave events to source spans
      self.addAlignmentEvents($source(), sourcespans, sourceal);

      // add mouseenter mouseleave events to target spans
      self.addAlignmentEvents($target, targetspans, targetal);
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

    // the "floating prediction" displays the predicted next word next to the
    // user's text caret
    var floatingPredItpVis; // singleton instance
    self.FloatingPrediction = (function () {
      var NUM_WORDS_LOOKAHEAD = 3;
      var HIDDEN = top.location.href.indexOf ('/translate-no-itp/') >= 0;

      if (floatingPredItpVis)
        // there can only be one
        floatingPredItpVis.FloatingPrediction.destroy();
      floatingPredItpVis = self;

      var elFloatPred = document.createElement ('div');
      if (!HIDDEN)
        document.body.appendChild (elFloatPred);

      var predictedText = null;
      setPredictedText (null);

      function getCaretPixelCoords () {
        // returns the X/Y coordinates, in fixed window pixels, of the text
        // caret
        // 
        // FIXME shouldn't this use getCaretXY() from jquery.editable.js ?
        // 
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
            }
          }
        }
        return typeof x === 'number' && typeof y === 'number'
              ? [parseInt(x),parseInt(y)] : null;
      }

      function adjustPosition () {
        var coord = getCaretPixelCoords();
        if (coord) {
          elFloatPred.style.top  = (coord[1]+10) + 'px';
          elFloatPred.style.left = (coord[0]+10) + 'px';
          showPredictedText();
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

      function setVisible (visible) {
        elFloatPred.className =
            'floating-prediction'
            + (visible ? '' : ' floating-prediction-hidden');
      }

      function setPredictedText (txt) {
        predictedText = txt;
        showPredictedText();
      }

      function showPredictedText () {
        if (!$target.editable('hasFocus')) {
          setVisible (false);
          return;
        }
        var txt = predictedText;
        var floatHtmlStr;
        if (txt) {
          var boldStart = $target.editable('getCaretPos');
          var predStart = skipBack (/^\S/, boldStart);
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
        if (floatHtmlStr) {
          elFloatPred.innerHTML = floatHtmlStr;
        }
        setVisible (!!floatHtmlStr);
      }

      function goToPos (pos) {
        // I thought this would be enough:
        //   $target.editable ('setCaretPos', $target.text().length);
        // but I can't get it to work.
        var token = $target.editable ('getTokenAtCaret', 0);
        var range = document.createRange();
        range.setStart (token.elem, pos);
        range.collapse();
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange (range);
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
        var newText = oldText.substring (0, pos) + insText + ' ' + sufText;
        $target.editable ('setText', newText);
        goToPos (pos + insText.length + 1);
        showPredictedText();
      }

      function destroy () {
        elFloatPred.parentNode.removeChild (elFloatPred);
      }

      // public methods for FloatingPrediction
      return {
        adjustPosition: adjustPosition,
        setPredictedText: setPredictedText,
        acceptNextWord: acceptNextWord,
        destroy: destroy
      };
    })();

  };
  
  module.exports = ItpVisualization; 

})('object' === typeof module ? module : {}, this);
