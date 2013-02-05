 
$(function(){

  UI.triggerSuggestionChosen = function(segment, which, translation) { 
    // a value of 0 for 'which' means the choice has been made by the
    // program and not by the user
    var event = $.Event("suggestionChosen");
    event.segment = segment[0];
    event.element = $(".target .editarea", segment);
    event.which = which;
    event.translation = translation;
    $(window).trigger("suggestionChosen", event);
  }


  
  // Overwrite UI methods ------------------------------------------------------
  
  UI.original_setContribution = UI.setContribution; 
  UI.setContribution = function() {
    if (config.replay == 1) {
      return;
    }
    UI.original_setContribution(arguments);
  }

  UI.original_setTranslation = UI.setTranslation; 
  UI.setTranslation = function() {
    if (config.replay == 1) {
      return;
    }
    UI.original_setTranslation(arguments);
  }

  
  UI.original_changeStatus = UI.changeStatus; 
  UI.changeStatus = function() {
    if (config.replay != 1) {
      var name = "";
      if (status == "draft") {
        name = "drafted";
      }
      else {
        name = status;
      }
      var event = $.Event(name);
      event.segment = ob;
      $(window).trigger(name, event);
    }
    UI.original_changeStatus(arguments);
  }

  UI.original_copySuggestionInEditarea = UI.copySuggestionInEditarea; 
  UI.copySuggestionInEditarea = function() {
    // text events will handle setting the editfield value on replay
    if (config.replay == 1) {
      if ($.trim(translation) != "") {
        editarea.addClass("fromSuggestion");
        $(".percentuage",segment).text(match).removeClass("per-orange per-green per-blue per-yellow").addClass(percentageClass).addClass("visible");
      }
      return; // do not allow translation to be set
    }
    UI.original_copySuggestionInEditarea(arguments);
  }

  UI.original_openSegment = UI.openSegment; 
  UI.openSegment = function() {
    UI.original_openSegment(arguments);
    
    if (config.replay != 1) {
      var event = $.Event("segmentOpened");
      event.segment = segment[0];
      $(window).trigger("segmentOpened", event);
    }
  }

  UI.original_closeSegment = UI.closeSegment; 
  UI.closeSegment = function() {
    UI.original_closeSegment(arguments);
    
    if (config.replay != 1) {
      // when using the url:
      // http://cas.ma.cat:8080/translate/en-fr.xliff/en-fr/1127-wmwzaxwm
      // then this fires on initial load just before a 'segmentOpened'.
      // the reason is the 'lastOpenedSegment stuff of matecat'.
      // when using this url, everything is fine
      // http://cas.ma.cat:8080/translate/en-fr.xliff/en-fr/1127-wmwzaxwm#607837
      // the 'if' fixes this
      if (window.location.href.indexOf('#') > -1) {
        var event = $.Event("segmentClosed");
        event.segment = segment[0];
        $(window).trigger("segmentClosed", event);
      }
    }
  }

  
  UI.original_gotoOpenSegment = UI.gotoOpenSegment; 
  UI.gotoOpenSegment = function() {
    UI.original_gotoOpenSegment(arguments);
    
    var event = $.Event("viewportToSegment");
    event.segment = this.currentSegment[0];
    $(window).trigger("viewportToSegment", event);
  }

  
    
  UI.original_setCurrentSegment = UI.setCurrentSegment; 
  UI.setCurrentSegment = function() {
    if (config.replay == 1) {
      debug("cat.js: Skipping setting current segment in setCurrentSegment()...");
      return;
    }
    UI.original_setCurrentSegment(arguments);
  }

  UI.original_chooseSuggestion = UI.chooseSuggestion; 
  UI.chooseSuggestion = function() {
    UI.original_chooseSuggestion(arguments);
    if (config.replay != 1) {
      UI.triggerSuggestionChosen(this.currentSegment, w,
      $('.editor ul[data-item='+w+'] li.b .translation').text());
    }
  }


  UI.original_topReached = UI.topReached; 
  UI.topReached = function() {
    if (config.replay == 1) {
      debug("cat.js: Skipping scrolling in topReached()...");
      return;
    }
    UI.original_topReached(arguments);
  }

  UI.original_copySource = UI.copySource; 
  UI.copySource = function() {
    UI.original_copySource(arguments);
    var event = $.Event("sourceCopied");
    event.segment = this.currentSegment[0];
    $(window).trigger("sourceCopied", event);
  }

  UI.original_scrollSegment = UI.scrollSegment; 
  UI.scrollSegment = function() {
    if (config.replay == 1) {
      debug("cat.js: Skipping scrolling in scrollSegment()...");
      return;
    }
    UI.original_scrollSegment(arguments);
  }

  
    
});
