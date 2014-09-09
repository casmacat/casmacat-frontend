$(function(){

  function trace() {
    try {
      throw new Error("stacktrace");
    }
    catch(e) {
      return e.stack;
    }
  }

  function insertScript(url, nodeName) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    var parentNode = document.getElementsByTagName(nodeName || 'head')[0];
    parentNode.appendChild(script);
    console.log("casmacat inserts script:", url);
  };

  function insertStyle(url) {
    var css = document.createElement('link');
    css.type = 'text/css';
    css.rel = "stylesheet";
    css.href = url;
    var parentNode = document.getElementsByTagName('head')[0];
    parentNode.appendChild(css);
    console.log("casmacat inserts style:", url);
  };

  insertStyle(config.basepath  + 'public/css/itp.css');

  require('jquery.editable.itp');


  var settings = {
      itp: {},
      visualization: config.prefs
    }

  if (config.catsetting) {
    var catsettingUrl = config.basepath + '/' + config.catsetting;
    var customSettings = require(catsettingUrl);
    jQuery.extend(settings, customSettings);
    console.log('Loading configuration "' + catsettingUrl +'"', settings, customSettings);
  }

  function getEditArea() {
    //return $(UI.currentSegment).find('.editarea');
    return UI.editarea || $('.editarea', UI.currentSegment);
  };

  function formatItpMatches(data) {
    var matches = [];
    for (var d, i = 0; i < data.nbest.length; ++i) {
      d = data.nbest[i];
      matches.push({
                 segment: data.source,
             translation: d.target,
              created_by: d.author,
                   match: parseInt(d.quality * 100),
        last_update_date: new Date()
      });
    }
    return { matches: matches };
  };

  function formatTranslationOptions(data) {
    var options = [];
    for (var d, i = 0; i < data.options.length; ++i) {
      d = data.options[i];
      options.push({
           level: d.level,
           start: d.start,
			 end: d.end,
			cost: d.full_cost,
		  phrase: d.phrase
      });
    }
    return { options: options };
  };
 
  //if (config.debug) {
    var $listDocs = $('<span style="float:left"><a href="'+config.basepath+'listdocuments/">Document list</a> &gt;</span>');
    var $shortCut = $('<div><a href="'+config.basepath+'listshortcuts/"><strong>Shortcuts</strong></a></div>');
    $shortCut.find("a").click(function(e){
      e.preventDefault();
      var url = $(this).attr("href");
      //window.open(url, "shortcuts-popup", "width=600,height=300,resizable=no,location=no,status=no,titlebar=no,toolbar=no,directories=no");
      window.open(url); // Just open in a new tab
    });
    $('header .breadcrumbs').prepend($listDocs).append($shortCut);
  //}


  // forward events to the logger through window 
  function forwardEvent(eventName, originalEvent, parameters) {
    var event = $.Event(eventName, originalEvent);
    event.type = eventName;
    $(window).trigger(event, parameters);
  }

  // Overwrite UI methods ------------------------------------------------------

  UI.callbacks = {};

  UI.setKeyboardShortcuts = function(){}; // FTW
  UI.reinitMMShortcuts    = function(){}; // Use shortcuts.js instead
  var shortcuts = require('shortcuts');


  if (config.penEnabled) {
    var htr = require('htr');
    insertStyle(config.basepath  + 'public/css/htr.css');
    UI.toggleKeyBindings['ctrl+shift+e'] = 'enableEpen'
  }
  else {
    settings.visualization.epenEnabled = false;
    settings.visualization.toggleEpenOffOnSegmentClose = true;
  }


  var original_openSegment = UI.openSegment;
  var original_closeSegment = UI.closeSegment;
  var original_doRequest = UI.doRequest;
  var original_copySuggestionInEditarea = UI.copySuggestionInEditarea;
  var original_setTranslation = UI.setTranslation;

  var pretranslatedSents = {};

  UI.openSegment = function(editarea) {
    original_openSegment.call(UI, editarea);

    var $target = $(editarea), sid = $target.data('sid'), $source = $("#segment-" + sid + "-source");
    if (!$target.data('itp')) {
      $target.on('ready.matecat', function(ev, data) {
        console.log('READY', ev, data);
        var $indicator;
        if (typeof(settings.itp) === 'undefined' || $.isEmptyObject(settings.itp)) {
          settings.itp = $target.editableItp('getConfig');
        }
        // enable S&R if server supports it and configuration is set 
        if ((settings.itp.hasOwnProperty('allowSearchReplace') && settings.itp.allowSearchReplace) || (!settings.itp.hasOwnProperty('allowSearchReplace') && config.srEnabled)) {
          setupSearchReplace();
        }

        //if ($.trim($target.text()).length === 0 && settings.itp.mode != "manual") {
        if (!settings.itp.hasOwnProperty('initialDecode') || settings.itp.initialDecode) {
           $target.editableItp('decode');
        }
        //}
        $target.editableItp('startSession');
        $target.editableItp('updateConfig', settings.itp);
        // A button to toggle ITP mode
        $indicator = ('.buttons', UI.currentSegment).find('.itp-indicator');
        if (config.itpEnabled) {
          if ($indicator.length === 0) {
            $indicator = $('<li/>').html('<a href="#" class="itp-btn itp-indicator">'+settings.itp.mode+'</a><p>ESC</p>');
            if ((settings.itp.hasOwnProperty('allowToggleMode') && !settings.itp.allowToggleMode)) {
              $indicator.click(function(e){e.preventDefault();});
              $indicator.css("opacity", 0.5);
            }
            else {
              $indicator.click(function(e){
                e.preventDefault();
                UI.toggleItp(e);
              });
            }
            $('.buttons', UI.currentSegment).prepend($indicator);
          }
        }

        // A button to toggle e-pen mode
        $indicator = $('.buttons', UI.currentSegment).find('.pen-indicator');
        if (config.htrserver && config.penEnabled && !$target.data('htr')) {
           $target.data('htr', true);
           htr.attachEvents($target);

          if ($indicator.length === 0) {
            $indicator = $('<li/>').html('<a href="#" class="itp-btn pen-indicator" title="Toggle e-pen input">&#9997;</a>');
            $indicator.click(function(e){
              e.preventDefault();
              getEditArea().editableItp('toggle', 'enableEpen');
            });
            $('.buttons', UI.currentSegment).prepend($indicator);
          }
          if (settings.visualization.epenEnabled && !settings.visualization.toggleEpenOffOnSegmentClose) {
            getEditArea().editableItp('toggle', 'enableEpen', true);
          }
        }
        // A series of buttons to toggle visualization options
        $indicator = $('.text', UI.currentSegment).find('.vis-commands');
        if ($indicator.length === 0) {
          var nav = '<a class="vis-button">visualization &gt;&gt;</a> <span class="vis-options">';
          for (var opt in shortcuts.toggles) {
            var toggleId = shortcuts.toggles[opt],
                labelId  = $(UI.currentSegment).attr("id") + "-" + toggleId,
                sc = opt.toUpperCase();

            var prefStatus  = settings.visualization[toggleId],
                checkStatus = (prefStatus) ? ' checked="checked"' : '';
            nav += '<input title='+sc+' type="checkbox" '+checkStatus+' id="'+labelId+'" name="'+toggleId+'"><label title='+sc+'>'+toggleId+'</label> ';
          }
          nav += '</span>';
          $indicator = $('<div class="vis-commands"/>').html(nav);
          $indicator.find('label').click(function(e){
            var fn = $(this).text();
            $target.editableItp('toggle', fn);
          });
          $indicator.find('input').click(function(e){
            var fn = $(this).attr('name');
            $target.editableItp('toggle', fn);
          });
          $('.text', UI.currentSegment).prepend($indicator);
          $('.vis-options').hide();
          $('.text', UI.currentSegment).find('.vis-button').click(function(e){
            e.preventDefault();

            // logging
            if ($(".vis-options").is(":hidden")) {
                forwardEvent('visMenuDisplayed', {}, {segment: UI.currentSegment[0]});
            }
            else {
                forwardEvent('visMenuHidden', {}, {segment: UI.currentSegment[0]});
            }
            // logging

            $(this).next().toggle("fast");
          });

          if ((settings.itp.hasOwnProperty('allowChangeVisualizationOptions') && !settings.itp.allowChangeVisualizationOptions)) {
            $indicator.hide();
          }
        }
      })
      .editableItp({
        sourceSelector: "#segment-" + sid + "-source",
        itpServerUrl:   config.itpserver,
        debug:          config.debug,
        replay:         config.replay
      }, settings.visualization)
      .on('togglechange.matecat', function (ev, toggle, value, cfg) {
        var $indicator = $('.text', UI.currentSegment).find('.vis-commands'),
            name = '#segment-' + sid + '-' + toggle;
        $indicator.find(name).attr('checked', value);

        forwardEvent('configChanged', ev, {segment: UI.currentSegment[0], config: JSON.parse("{ \"prefs\": { \"" + toggle + "\": \"" + value + "\" } }")});
      })
      .on('itptogglechange.matecat', function (ev, pos, stack) {
        forwardEvent('configChanged', ev, {segment: UI.currentSegment[0], config: JSON.parse("{ \"prefs\": { \"mode\": \"" + arguments[1] + "\" } }")});
      })
      .on('mousewheelup.matecat', function (ev, pos, stack) {
        forwardEvent('mouseWheelUp', ev, {segment: UI.currentSegment[0]});
      })
      .on('mousewheeldown.matecat', function (ev, pos, stack) {
        forwardEvent('mouseWheelDown', ev, {segment: UI.currentSegment[0]});
      })
      .on('mousewheelinvalidate.matecat', function (ev) {
        forwardEvent('mouseWheelInvalidate', ev, {segment: UI.currentSegment[0]});
      })
      .on('mementoundo.matecat', function (ev, pos, stack) {
        forwardEvent('mementoUndo', ev, {segment: UI.currentSegment[0]});
      })
      .on('mementoredo.matecat', function (ev, pos, stack) {
        forwardEvent('mementoRedo', ev, {segment: UI.currentSegment[0]});
      })
      .on('mementoinvalidate.matecat', function (ev) {
        // TODO What is this?
        forwardEvent('mementoInvalidate', ev, {segment: UI.currentSegment[0]});
      })
      .on('decode.matecat', function (ev, data, err) {
        forwardEvent('translationChanged', ev, {element: $target[0], type: "decode", data: data});
      })
      .on('suffixchange.matecat', function (ev, data, err) {
        forwardEvent('translationChanged', ev, {element: $target[0], type: "suffixchange", data: data});
      })
      .on('confidences.matecat', function (ev, data, err) {
        forwardEvent('translationChanged', ev, {element: $target[0], type: "confidences", data: data});
      })
      .on('tokens.matecat', function (ev, data, err) {
        forwardEvent('translationChanged', ev, {element: $target[0], type: "tokens", data: data});
      })
      .on('alignments.matecat', function (ev, data, err) {
          forwardEvent('translationChanged', ev, {element: $target[0], type: "alignments", data: data});

          $target.find('span.editable-token')
          .off('mouseenter.matecat mouseleave.matecat caretenter.matecat caretleave.matecat')
          .on('mouseenter.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            var data = {
                target: ev.target,
                x: ev.clientX,
                y: ev.clientY
            };
            forwardEvent('showAlignmentByMouse', ev, data);
          })
          .on('mouseleave.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            forwardEvent('hideAlignmentByMouse', ev, ev.target);
          })
          .on('caretenter.matecat', function (ev, data) {
            if (!settings.visualization.displayCaretAlign) return;
            // change dom node in data by its id to avoid circular problem when converting to JSON
            var d = jQuery.extend({}, data); d.token = '#'+d.token.id;
            forwardEvent('showAlignmentByKey', ev, {element: $target[0], type: "caretenter", data: d});
          })
          .on('caretleave.matecat', function (ev, data) {
            if (settings.visualization.displayShadeOffTranslatedSource) {
            }
            if (!settings.visualization.displayCaretAlign) return;
            // change dom node in data by its id to avoid circular problem when converting to JSON
            var d = jQuery.extend({}, data); d.token = '#'+d.token.id;
            if (config.displayCaretAlign) forwardEvent('hideAlignmentByKey', ev, {element: $target[0], type: "caretleave", data: d});
          })

          $source.find('span.editable-token').off('mouseenter.matecat mouseleave.matecat')
          .on('mouseenter.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            var data = {
                target: ev.target,
                x: ev.clientX,
                y: ev.clientY
            };
            forwardEvent('showAlignmentByMouse', ev, data);
          })
          .on('mouseleave.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            forwardEvent('hideAlignmentByMouse', ev, ev.target);
          })
      })

      /// Capture epen events
      .on('htrresult.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRRESULT', ev, data, err);
        //merc - saving nbest in logging
        $target.trigger('htrResult', [data, err]);
      })
      .on('htrupdate.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRUPDATE', ev, data, err);
        // merc - adding updating to logging
        $target.trigger('htrUpdate', [data, err]);
      })
      .on('htrnbestclick.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRNBESTCLICK', ev, data, err);
        $target.trigger('htrUpdate', [data, err]);
      })
      .on('htrtextchange.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRTEXTCHANGE', ev, data, err);
        $target.trigger('htrTextChange', [data, err]);
      })
      .on('htrstart.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRSTART', ev, data, err);
        $target.trigger('htrStart', [data, err]);
      })
      .on('htraddstroke.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRADDSTROKE', ev, data, err);
        $target.trigger('htrAddStroke', [data, err]);
      })
      .on('htrend.matecat', function (ev, data, err) {
        console.log('CAPTURE HTREND', ev, data, err);
        $target.trigger('htrTrend', [data, err]);
      })
      .on('htrgesture.matecat', function (ev, data, err) {
        console.log('CAPTURE HTRGESTURE', ev, data, err);
        $target.trigger('htrGesture', [data, err]);
      });

      if ((!settings.itp.hasOwnProperty('allowChangeVisualizationOptions') || settings.itp.allowChangeVisualizationOptions)) {
        $('.text', UI.currentSegment).find('.vis-commands').show();
      }
      addSearchReplaceEvents();
    }
    else {
      //console.log("***ALREADY OPENED SEGMENT***", $target[0], trace())
    }
    UI.pretranslateNextFewSentences();
  };

  UI.closeSegment = function(segment, bybutton) {
    // WTF? function semantics is not the same as in openSegment
    if (segment) {
      var sid = $(segment).attr('id');
      var $target = $('#'+sid+'-editarea'), $source = $('#'+sid+'-editarea');
      //console.log("***CLOSE SEGMENT***", $target[0], trace())
      $target.find('*').andSelf().off('.matecat');
      $source.find('*').andSelf().off('.matecat');
      $target.editableItp('destroy');
      if ($target.hasClass('epen-target') && bybutton) {
        getEditArea().editableItp('toggle', 'enableEpen', false);
      }
      $target.data('htr', false);
    }

    $('.vis-commands').hide();
    original_closeSegment.call(UI, segment, bybutton);
  };

  /*UI.copySuggestionInEditarea = function(editarea) {
    $('.editarea').editable({ ... });
    original_copySuggestionInEditarea.call(UI, editarea);
  };*/

  UI.doRequest = function(req) {
    var d = req.data, a = d.action, $ea = getEditArea();
    UI.saveCallback(a, req);
    // Call action
    switch(a) {
      case "getContribution":
        $ea.unbind('decode').bind('decode', function(e, data, err){
          UI.executeCallback(a, {
            data: formatItpMatches(data)
          });
        });
        // Edge case: Loading a DRAFTed segment should fire the complete UI callback
        if (typeof d.num_results === 'undefined') {
          req.complete(d);
        }
        break;
	  case "getTranslationOptions":
        $ea.bind('decode', function(e, data, err){
          UI.executeCallback(a, {
            dopt: formatTranslationOptions(data),
			sourceSegmentation:  data.sourceSegmentation
          });
		});
		// Edge case: Loading a DRAFTed segment should fire the complete UI callback
        if (typeof d.options === 'undefined') {
          req.complete(d);
        }
	  break;
      case "setContribution":
        $ea.unbind('validate').bind('validate', function(e, data, err){
          UI.executeCallback(a, {
            data: formatItpMatches(data)
          });
        });
        break;
      default:
        console.log("Forwarding request 'as is':", a);
        original_doRequest.call(UI, req);
        break;
    }
  };

  UI.saveCallback = function(action, req) {
    if ((req.success  && typeof req.success  === 'function') ||
        (req.complete && typeof req.complete === 'function')) {
      // Merge callbacks, as we don't have an Ajax transport in ITP
      if (!UI.callbacks.hasOwnProperty(action)) UI.callbacks[action] = [];
      UI.callbacks[action].push(req);
    }
  };

  UI.executeCallback = function(action, data) {
    var req = UI.callbacks[action].shift();
    if (typeof req === 'undefined') return;
    if (req.hasOwnProperty('success') && typeof req.success === 'function') {
      console.log("executing success callback:", action, data);
      req.success(data);
    }
    if (req.hasOwnProperty('complete') && typeof req.complete === 'function') {
      console.log("executing complete callback:", action, data);
      req.complete(data);
    }
    //return req.data;
  };

  UI.setTranslation = function(segment, status) {
    original_setTranslation.call(UI, segment, status);
    if (status === 'translated') {
      getEditArea().editableItp('validate');
    }
  };

  UI.pretranslateNextFewSentences = function () {
      try {
          var NUM_PREFETCH = 3;
          var itpServer = getEditArea().editableItp('itpServer');
          var segElem = $(UI.currentSegment);
          for (var i = 0; i < NUM_PREFETCH; i++) {
              segElem = segElem.next('section');
              var segElemId = segElem.attr('id');
              if (!segElemId)
                  break;
              var segId = segElemId.split('-')[1];
              var src = $("#segment-" + segId + "-source").text();
              if (!pretranslatedSents.hasOwnProperty(src)) {
                  itpServer.decode({source: src, segId:segId, isPreFetch:true});
                  pretranslatedSents[src] = true;
              }
          }
      } catch (e) {
          console.log (['pretranslateNextFewSentences failed', e.toString(), e]);
      }
  };

  if (!config.replay && config.debug) { // enable reset document button
    $("#resetDocument").text('Reset Document').on("click", function(e) {
      getEditArea().editableItp('reset');
    });
  }


  // BEGIN S&R facilities ------------------------------------------------------
  $('#sr-rules').hide(); // In any case, this must be hidden beforehand

  function addSearchReplaceEvents() {
    var $ea = getEditArea(), itpServer = $ea.editableItp('itpServer');

    itpServer.on('setReplacementRuleResult', function(data, err) {
      itpServer.getReplacementRules();
      forwardEvent('srRulesSetting', {}, {segment: UI.currentSegment[0]});
    });

    itpServer.on('delReplacementRuleResult', function(data, err) {
      itpServer.getReplacementRules();
      forwardEvent('srRuleDeleted', {}, {segment: UI.currentSegment[0]});
    });

    itpServer.on('applyReplacementRulesResult', function(data, err) {
      forwardEvent('srRulesApplied', {}, {segment: UI.currentSegment[0]});
    });

    itpServer.on('getReplacementRulesResult', function(data, err) {

      $('#sr-rules').empty();
      for (var i = 0; i < data.rules.length; ++i) {
        processRule(data.rules[i]);
      }

      forwardEvent('srRulesSet', {}, {segment: UI.currentSegment[0], rules: data.rules});
    });
  };

  function delSearchReplaceEvents() {
    var $ea = getEditArea(), itpServer = $ea.editableItp('itpServer');
    itpServer.off('setReplacementRuleResult delReplacementRuleResult getReplacementRulesResult');
  };

  function processRule(rule) {
    var $ea = getEditArea(), itpServer = $ea.editableItp('itpServer');
    // Apply rule for the first time
    var sid = $ea.data('sid'), $source = $("#segment-" + sid + "-source");
    itpServer.applyReplacementRules({
      source: $source.text(),
      target: $ea.editable('getText'),
    });
    // Then inform the user about the rule
    var $btn = $('<a class="sr-delrule" href="#">[remove]</a>');
    $btn.click(function(e){
      e.preventDefault();
      var $ea = getEditArea(), itpServer = $ea.editableItp('itpServer');
      itpServer.delReplacementRule({ruleId: rule.ruleId});
      //if ($('#sr-rules ol li').length === 0) $('#sr-rules').hide();
    });
    var $li = $('<li/>');
    if (rule.fails > 0) $li.css('color', 'red');
    $li.data('rule', JSON.stringify(rule));
    var ruleText  = "source: " + rule.sourceRule;
        ruleText += " | target: " + rule.targetRule;
        ruleText += " | replacement: " + rule.targetReplacement;
    if (rule.isRegExp)  ruleText += " | regexp";
    if (rule.matchCase) ruleText += " | case sensitive";
        ruleText += " ";
    $li.text(ruleText).append($btn);
    $('#sr-rules').append($li);
  };

  function setupSearchReplace() {
    $('#sr-viewreplaceBtn').click(function(ev){

        // logging
        if ($("#sr-rules").is(":hidden")) {
          forwardEvent('srMenuDisplayed', ev, {segment: UI.currentSegment[0]});
        }
        else {
          forwardEvent('srMenuHidden', ev, {segment: UI.currentSegment[0]});
        }
        // logging

      $('#sr-rules').toggle("fast");
    });

    // logging
    $("#sr-matchCase, #sr-isRegExp").click(function(ev) {

        if ($(this).prop("checked")) {
          forwardEvent(this.name + "On", ev, {segment: UI.currentSegment[0]});
        }
        else {
          forwardEvent(this.name + "Off", ev, {segment: UI.currentSegment[0]});
        }
    });
    // logging

    $('#sr-addreplaceBtn').click(function(ev){
      var rule = {};
      $("#sr-replace :input").each(function(){
        var $this = $(this);
        if (!$this.attr('name')) return;
        if ($this.attr('type') === 'checkbox') {
          rule[$this.attr('name')] = $this.prop('checked');
        }
        else {
          rule[$this.attr('name')] = $this.val();
        }
      });
      var $ea = getEditArea(), itpServer = $ea.editableItp('itpServer');
      itpServer.setReplacementRule(rule);
    });
  };
  // END S&R facilities --------------------------------------------------------

});
