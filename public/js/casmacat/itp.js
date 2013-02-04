$(function(){

  //if (typeof UI === 'undefined') throw "Missing cat.js file";
  
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

  function getEditArea() {
    //return $(UI.currentSegment).find('.editarea');
    return UI.editarea || $('.editarea', UI.currentSegment);
  };
  
  function formatItpMatches(data) {
    var matches = [];
    for (var d, i = 0; i < data.nbest.length; ++i) {
      d = data.nbest[i];
      matches.push({
                  source: data.source,
             translation: d.target,
              created_by: d.author,
                   match: d.quality,
        last_update_date: new Date()
      });
    }
    return { matches: matches };
  };
  
  // Overwrite UI methods ------------------------------------------------------

  UI.callbacks = {};

  UI.setKeyboardShortcuts = function(){}; // FTW
  UI.original_openSegment = UI.openSegment;
  UI.original_closeSegment = UI.closeSegment;
  UI.original_doRequest = UI.doRequest;
  UI.original_copySuggestionInEditarea = UI.copySuggestionInEditarea;

  UI.openSegment = function(editarea) {
    UI.original_openSegment(editarea);
    var $target = $(editarea), sid = $target.data('sid');
    console.log('open', $target);
    $target.on('ready', function() {
      console.log('onready', $target.text());
      if ($target.text().length === 0) $target.editableItp('decode'); 
      $target.editableItp('startSession'); 
    })
    .editableItp({
      sourceSelector: "#segment-" + sid + "-source",
      itpServerUrl:   config.catserver
    });
  };
  
  UI.closeSegment = function(editarea) {
    // WTF? editarea semantics is not the same as in openSegment
    console.log('close*', editarea);
    if (editarea) {
      var sid = $(editarea).attr('id');
      var $target = $('#'+sid+'-editarea');
      console.log('close', $target);
      $target.editableItp('destroy');
    }
    UI.original_closeSegment(editarea);
  };

  /*UI.copySuggestionInEditarea = function(editarea) {
    $('.editarea').editable({ ... });
    UI.original_copySuggestionInEditarea(editarea);
  };*/

  UI.doRequest = function(req) {
    var d = req.data, a = d.action, ea = getEditArea();
    UI.saveCallback(a, req);
    // Call action
    switch(a) {
      case "getContribution":
        ea.unbind('decode').bind('decode', function(e, data, err){
          UI.executeCallback(a, {
            data: formatItpMatches(data)
          });
        });
        break;
      case "setContribution":
        ea.unbind('validate').bind('validate', function(data, err){
          UI.executeCallback(a, {
            data: formatItpMatches(data)
          });
        });

        break;        
      default:
        console.log("Forwarding request 'as is':", a);
        UI.original_doRequest(req);
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
    
});
