 
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
  UI.setContribution = function(segment,status,byStatus) {
    if (config.replay == 1) {
      return;
    }
    UI.original_setContribution(segment,status,byStatus);
  }

  UI.original_setTranslation = UI.setTranslation; 
  UI.setTranslation = function(segment,status) {
    if (config.replay == 1) {
      return;
    }
    UI.original_setTranslation(segment,status);
  }

  
  UI.original_changeStatus = UI.changeStatus; 
  UI.changeStatus = function(ob,status,byStatus) {
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
    UI.original_changeStatus(ob,status,byStatus);
  }

  UI.original_copySuggestionInEditarea = UI.copySuggestionInEditarea; 
  UI.copySuggestionInEditarea = function(segment,translation,editarea,match,decode) {
    // text events will handle setting the editfield value on replay
    if (config.replay == 1) {
      if ($.trim(translation) != "") {
        var percentageClass = this.getPercentuageClass(match);
        editarea.addClass("fromSuggestion");
        $(".percentuage",segment).text(match).removeClass("per-orange per-green per-blue per-yellow").addClass(percentageClass).addClass("visible");
      }
      return; // do not allow translation to be set
    }
    UI.original_copySuggestionInEditarea(segment,translation,editarea,match,decode);
  }

  UI.original_openSegment = UI.openSegment; 
  UI.openSegment = function(editarea) {
    UI.original_openSegment(editarea);
    
    if (config.replay != 1) {
      var event = $.Event("segmentOpened");
      event.segment = segment[0];
      $(window).trigger("segmentOpened", event);
    }
  }

  UI.original_closeSegment = UI.closeSegment; 
  UI.closeSegment = function(segment,byButton) {
    UI.original_closeSegment(segment,byButton);
    
    if (segment && config.replay != 1) {
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
    UI.original_gotoOpenSegment();
    
    var event = $.Event("viewportToSegment");
    event.segment = this.currentSegment[0];
    $(window).trigger("viewportToSegment", event);
  }

  
    
  UI.original_setCurrentSegment = UI.setCurrentSegment; 
  UI.setCurrentSegment = function(segment,closed) {
    if (config.replay == 1) {
      debug("cat.js: Skipping setting current segment in setCurrentSegment()...");
      return;
    }
    UI.original_setCurrentSegment(segment,closed);
  }

  UI.original_chooseSuggestion = UI.chooseSuggestion; 
  UI.chooseSuggestion = function(w) {
    UI.original_chooseSuggestion(w);
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
    UI.original_topReached();
  }

  UI.original_copySource = UI.copySource; 
  UI.copySource = function() {
    UI.original_copySource();
    var event = $.Event("sourceCopied");
    event.segment = this.currentSegment[0];
    $(window).trigger("sourceCopied", event);
  }

  UI.original_scrollSegment = UI.scrollSegment; 
  UI.scrollSegment = function(segment) {
    if (segment.length === 0) return;
    if (config.replay == 1) {
      debug("cat.js: Skipping scrolling in scrollSegment()...");
      return;
    }
    UI.original_scrollSegment(segment);
  }

  
    
});
