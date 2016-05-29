(function(module, global){

  require('jquery.hotkeys');
  
  UI.addKeyboardShortcut = function(combo, fn) {
    // XXX: Should events be attached to other DOM nodes?
    $("body, .editarea").bind('keydown', combo, fn);
  };
  
  UI.delKeyboardShortcut = function(combo, fn) {
    // XXX: Should events be detached from other DOM nodes?
    $("body, .editarea").unbind('keydown', combo, fn);
  };

  function getEditArea() {
    return UI.editarea || $('.editarea', UI.currentSegment)
  };
  
  // Define handlers as named functions to ease attaching/detaching
  
  function loadNextSegment(e) {
    e.preventDefault();
    UI.gotoNextSegment();  
  };
  
  function loadPrevSegment(e) {
    e.preventDefault();
    UI.gotoPreviousSegment();
  };
  
  function copySourceToTarget(e) {
    e.preventDefault();
    UI.copySource();
    getEditArea().editableItp('updateTokens');
  };
  
  function validateTranslation(e) {
    e.preventDefault();
    // This is copied from cat.js ¬¬
    $('.editor .translated').click();
  };
  
  function chooseSuggestion(e) {
    e.preventDefault();
    var num;
    switch(e.which) {
      case 49:  // key 1
      case 97:  // numpad 1
        num = 1;
        break;
      case 50:  // key 2
      case 98:  // numpad 2
        num = 2;
        break;
      case 51:  // key 3
      case 99:  // numpad 3
        num = 3;
      case 52:  // key 4
      case 100: // numpad 4
        num = 4;
        break;
      case 53:  // key 5
      case 101: // numpad 5
        num = 5;
    }
    UI.chooseSuggestion(num);
    getEditArea().editableItp('updateTokens');
  };
  
  function clearTarget(e) {
    e.preventDefault();
    getEditArea().editable('setText', "");
  };
  
  function saveDraft(e) {
    // Copied from cat.js
    $('.editor .draft').click();
  };
  
  // Expose this function to other modules
  UI.toggleItp = function(e) {
	console.log(UI.toggleItp);
    e.preventDefault();
    var $ea = getEditArea(),
        currentMode = $ea.editableItp('getConfig').mode;
     
    if (!$ea.editableItp('getConfig').allowToggleMode) return;

    if (currentMode == "manual") {
      return false;
    }
    if (currentMode == "PE") {
      newMode = "ITP";
    }
    else if (currentMode == "TOUCH") {
      newMode = "EDIT";
    }
    else if (currentMode == "EDIT") {
      newMode = "PE";
    }
    else if (currentMode == "ITP") {
      newMode = window.config.toucheditEnabled ? "TOUCH" : "PE";
    }

    if (currentMode == "TOUCH") {
      UI.switchTouchEditing();
    }
    if (currentMode == "EDIT") {
      UI.exitTouchEditing();
    }

    $ea.editableItp('updateConfig', {
      mode: newMode
    });

    // start session with new ITP mode
    $ea.editableItp('startSession');
    // Inform user via UI
    // FIXME: Selecting by ID doesn't work (!?) We must specify also the node type: a#id
    $('.itp-indicator').text(newMode);
    console.log('new mode:', newMode);
    if (newMode === "PE" || newMode === "TOUCH" || newMode === "EDIT") {
		getEditArea().editableItp('toggle', 'limitSuffixLength', false);
		if (getEditArea().text().length == 0)
		        UI.chooseSuggestion('1'); // if textarea is empty, insert best translation to Post-Edit
		if (window.config.floatPredictions){
			document.getElementById("el-float-pred").className = 'floating-prediction floating-prediction-hidden';  // set invisible
		}
		if (newMode == "TOUCH") {
			UI.initTouchEditing();
		}
    }
    else if (newMode == "ITP") {
	getEditArea().removeClass("touch-edit");
	getEditArea().editableItp('toggle', 'limitSuffixLength', true);
	if (window.config.floatPredictions){
		document.getElementById("el-float-pred").className = 'floating-prediction'; //setVisible();
	}
    }
    $ea.trigger('itptogglechange', [newMode]);
  };
  

  // Define key bindings here
  
  var keyBindings = UI.keyBindings = {
        'ctrl+up': loadPrevSegment,
      'ctrl+down': loadNextSegment,
    'ctrl+insert': copySourceToTarget,
    'ctrl+return': validateTranslation,
         'ctrl+1': chooseSuggestion,
         'ctrl+2': chooseSuggestion,
         'ctrl+3': chooseSuggestion,
         'ctrl+4': chooseSuggestion,
         'ctrl+5': chooseSuggestion,
       'ctrl+del': clearTarget,
            'esc': UI.toggleItp,
         'return': saveDraft,
  };
  
  if (UI.launchBiconcor) {
    keyBindings['ctrl+b'] = UI.launchBiconcor;
  }

  var toggleKeyBindings = UI.toggleKeyBindings = {
   'ctrl+shift+1': 'displayMouseAlign',
         'ctrl+m': 'displayCaretAlign',
   'ctrl+shift+2': 'displayShadeOffTranslatedSource',
   'ctrl+shift+3': 'displayConfidences',
   'ctrl+shift+4': 'highlightValidated',
   'ctrl+shift+5': 'highlightPrefix',
   'ctrl+shift+6': 'highlightSuffix',
   'ctrl+shift+m': 'highlightLastValidated',
   'ctrl+shift+s': 'limitSuffixLength',
  };

  var toggleOpt = function(optname, value) {
    return function(e) {
      getEditArea().editableItp('toggle', optname, value);
    }
  };

  for (var k in keyBindings) {
    if (keyBindings.hasOwnProperty(k)) {
      UI.addKeyboardShortcut(k, keyBindings[k]);
    }
  }

  for (var t in toggleKeyBindings) {
    if (toggleKeyBindings.hasOwnProperty(t)) {
      UI.addKeyboardShortcut(t, toggleOpt(toggleKeyBindings[t]));
    }
  }
 
  module.exports = {
    toggles: toggleKeyBindings,
  };
  
})('object' === typeof module ? module : {}, this);
