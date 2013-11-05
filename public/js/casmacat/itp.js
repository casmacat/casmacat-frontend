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
      itp: undefined,
      visualization: config.prefs
    }

  if (config.catsetting) {
    jQuery.extend(settings, require(config.basepath + '/' + config.catsetting));
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

  UI.openSegment = function(editarea) {
    original_openSegment.call(UI, editarea);
    // XXX: in ITP mode Matecat does not clear blockButtons
    UI.blockButtons = false;
    var $target = $(editarea), sid = $target.data('sid'), $source = $("#segment-" + sid + "-source");
    if (!$target.data('itp')) {
      //console.log("***OPEN SEGMENT***", $target[0], trace())

      $target.on('ready.matecat', function() {
        var $indicator;
        if (typeof(settings.itp) === 'undefined') {
          settings.itp = $target.editableItp('getConfig');
        }
        // enable S&R if server supports it and configuration is set 
        if ((settings.itp.hasOwnProperty('allowSearchReplace') && settings.itp.allowSearchReplace) || (!settings.itp.hasOwnProperty('allowSearchReplace') && config.srEnabled)) {
          setupSearchReplace();
        }

        if ($.trim($target.text()).length === 0 && settings.itp.mode != "manual") {
          $target.editableItp('decode');
        }
        $target.editableItp('startSession');
        $target.editableItp('updateConfig', settings.itp);
        // A button to toggle ITP mode
        $indicator = ('.buttons', UI.currentSegment).find('.itp-indicator');
        if (config.itpEnabled) {
          if ($indicator.length === 0) {
            $indicator = $('<li/>').html('<a href="#" class="itp-btn itp-indicator">'+settings.itp.mode+'</a><p>ESC</p>');
            $indicator.click(function(e){
              e.preventDefault();
              UI.toggleItp(e);
            });
            $('.buttons', UI.currentSegment).prepend($indicator);
          }
        }
        // A button to toggle e-pen mode
        $indicator = $('.buttons', UI.currentSegment).find('.pen-indicator');
        if (config.htrserver && config.penEnabled) {
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
                var event = $.Event("visMenuDisplayed");
                event.segment = UI.currentSegment[0];
                $(window).trigger("visMenuDisplayed", event);
            }
            else {
                var event = $.Event("visMenuHidden");
                event.segment = UI.currentSegment[0];
                $(window).trigger("visMenuHidden", event);
            }
            // logging

            $(this).next().toggle("fast");
          });
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

        var event = $.Event("configChanged");
        event.segment = UI.currentSegment[0];
        event.config = JSON.parse("{ \"prefs\": { \"" + toggle + "\": \"" + value + "\" } }");
        $(window).trigger("configChanged", event);
      })
      .on('itptogglechange.matecat', function (ev, pos, stack) {

        var event = $.Event("configChanged");
        event.segment = UI.currentSegment[0];
        event.config = JSON.parse("{ \"prefs\": { \"mode\": \"" + arguments[1] + "\" } }");
        $(window).trigger("configChanged", event);
      })
      .on('mousewheelup.matecat', function (ev, pos, stack) {

        var event = $.Event("mouseWheelUp");
        event.segment = UI.currentSegment[0];
        $(window).trigger("mouseWheelUp", event);
      })
      .on('mousewheeldown.matecat', function (ev, pos, stack) {

        var event = $.Event("mouseWheelDown");
        event.segment = UI.currentSegment[0];
        $(window).trigger("mouseWheelDown", event);
      })
      .on('mousewheelinvalidate.matecat', function (ev) {

        var event = $.Event("mouseWheelInvalidate");
        event.segment = UI.currentSegment[0];
        $(window).trigger("mouseWheelInvalidate", event);
      })
      .on('mementoundo.matecat', function (ev, pos, stack) {

        var event = $.Event("mementoUndo");
        event.segment = UI.currentSegment[0];
        $(window).trigger("mementoUndo", event);
      })
      .on('mementoredo.matecat', function (ev, pos, stack) {

        var event = $.Event("mementoRedo");
        event.segment = UI.currentSegment[0];
        $(window).trigger("mementoRedo", event);
      })
      .on('mementoinvalidate.matecat', function (ev) {
        // TODO What is this?
        var event = $.Event("mementoInvalidate");
        event.segment = UI.currentSegment[0];
        $(window).trigger("mementoInvalidate", event);
      })
      .on('decode.matecat', function (ev, data, err) {
          $(window).trigger('translationChanged', {element: $target[0], type: "decode", data: data});
      })
      .on('suffixchange.matecat', function (ev, data, err) {
          $(window).trigger('translationChanged', {element: $target[0], type: "suffixchange", data: data});
      })
      .on('confidences.matecat', function (ev, data, err) {
          $(window).trigger('translationChanged', {element: $target[0], type: "confidences", data: data});
      })
      .on('tokens.matecat', function (ev, data, err) {
          $(window).trigger('translationChanged', {element: $target[0], type: "tokens", data: data});
      })
      .on('alignments.matecat', function (ev, data, err) {
          $(window).trigger('translationChanged', {element: $target[0], type: "alignments", data: data});

          $target.find('span.editable-token')
          .off('mouseenter.matecat mouseleave.matecat caretenter.matecat caretleave.matecat')
          .on('mouseenter.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            var data = {
                target: ev.target,
                x: ev.clientX,
                y: ev.clientY
            };
            $(window).trigger('showAlignmentByMouse', data);
          })
          .on('mouseleave.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            $(window).trigger('hideAlignmentByMouse', ev.target);
          })
          .on('caretenter.matecat', function (ev, data) {
            if (!settings.visualization.displayCaretAlign) return;
            // change dom node in data by its id to avoid circular problem when converting to JSON
            var d = jQuery.extend({}, data); d.token = '#'+d.token.id;
            $(window).trigger('showAlignmentByKey', {element: $target[0], type: "caretenter", data: d});
          })
          .on('caretleave.matecat', function (ev, data) {
            if (!settings.visualization.displayCaretAlign) return;
            // change dom node in data by its id to avoid circular problem when converting to JSON
            var d = jQuery.extend({}, data); d.token = '#'+d.token.id;
            if (config.displayCaretAlign) $(window).trigger('hideAlignmentByKey', {element: $target[0], type: "caretleave", data: d});
          })

          $source.find('span.editable-token').off('mouseenter.matecat mouseleave.matecat')
          .on('mouseenter.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            var data = {
                target: ev.target,
                x: ev.clientX,
                y: ev.clientY
            };
            $(window).trigger('showAlignmentByMouse', data);
          })
          .on('mouseleave.matecat', function (ev) {
            if (!settings.visualization.displayMouseAlign) return;
            $(window).trigger('hideAlignmentByMouse', ev.target);
          })
      });

      $('.text', UI.currentSegment).find('.vis-commands').show();
      addSearchReplaceEvents();
    }
    else {
      //console.log("***ALREADY OPENED SEGMENT***", $target[0], trace())
    }
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
    }

    $('.vis-commands').hide();
    original_closeSegment.call(UI, segment);
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
    original_closeSegment.call(UI, segment, status);

    if (status === 'translated') {
      getEditArea().editableItp('validate');
    }
  };



  // BEGIN S&R facilities ------------------------------------------------------
  $('#sr-rules').hide(); // In any case, this must be hidden beforehand

  function addSearchReplaceEvents() {
    var $ea = getEditArea(), itpServer = $ea.editableItp('itpServer');

    itpServer.on('setReplacementRuleResult', function(data, err) {
      itpServer.getReplacementRules();

        var event = $.Event("srRulesSetting");
        event.segment = UI.currentSegment[0];
        $(window).trigger("srRulesSetting", event);
    });

    itpServer.on('delReplacementRuleResult', function(data, err) {
        itpServer.getReplacementRules();

        var event = $.Event("srRuleDeleted");
        event.segment = UI.currentSegment[0];
        $(window).trigger("srRuleDeleted", event);
    });

    itpServer.on('applyReplacementRulesResult', function(data, err) {

        var event = $.Event("srRulesApplied");
        event.segment = UI.currentSegment[0];
        $(window).trigger("srRulesApplied", event);
    });

    itpServer.on('getReplacementRulesResult', function(data, err) {

      $('#sr-rules').empty();
      for (var i = 0; i < data.rules.length; ++i) {
        processRule(data.rules[i]);
      }

        var event = $.Event("srRulesSet");
        event.segment = UI.currentSegment[0];
        event.rules = data.rules;
        $(window).trigger("srRulesSet", event);
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
    $('#sr-viewreplaceBtn').click(function(e){

        // logging
        if ($("#sr-rules").is(":hidden")) {
            var event = $.Event("srMenuDisplayed");
            event.segment = UI.currentSegment[0];
            $(window).trigger("srMenuDisplayed", event);
        }
        else {
            var event = $.Event("srMenuHidden");
            event.segment = UI.currentSegment[0];
            $(window).trigger("srMenuHidden", event);
        }
        // logging

      $('#sr-rules').toggle("fast");
    });

    // logging
    $("#sr-matchCase, #sr-isRegExp").click(function(e) {

        if ($(this).prop("checked")) {
            var event = $.Event(this.name + "On");
            event.segment = UI.currentSegment[0];
            $(window).trigger(this.name + "On", event);
        }
        else {
            var event = $.Event(this.name + "Off");
            event.segment = UI.currentSegment[0];
            $(window).trigger(this.name + "Off", event);
        }
    });
    // logging

    $('#sr-addreplaceBtn').click(function(e){
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
