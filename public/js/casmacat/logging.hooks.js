 
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
  
  var original_setContribution = UI.setContribution; 
  UI.setContribution = function(segment,status,byStatus) {
    if (config.replay == 1) {
      return;
    }
    original_setContribution.call(UI, segment,status,byStatus);
  }

  var original_setTranslation = UI.setTranslation; 
  UI.setTranslation = function(segment,status) {
    if (config.replay == 1) {
      return;
    }
    original_setTranslation.call(UI, segment,status);
  }

  
  var original_changeStatus = UI.changeStatus; 
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
    original_changeStatus.call(UI, ob,status,byStatus);
  }

  var original_copySuggestionInEditarea = UI.copySuggestionInEditarea; 
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
    original_copySuggestionInEditarea.call(UI, segment,translation,editarea,match,decode);
  }

  var original_openSegment = UI.openSegment; 
  UI.openSegment = function(editarea) {
    original_openSegment.call(UI, editarea);
    
    if (config.replay != 1) {
      var event = $.Event("segmentOpened");
      event.segment = segment[0];
      $(window).trigger("segmentOpened", event);
    }
  }

  var original_closeSegment = UI.closeSegment; 
  UI.closeSegment = function(segment,byButton) {
    original_closeSegment.call(UI, segment,byButton);
    
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

  
  var original_gotoOpenSegment = UI.gotoOpenSegment; 
  UI.gotoOpenSegment = function() {
    original_gotoOpenSegment.call(UI);
    
    var event = $.Event("viewportToSegment");
    event.segment = this.currentSegment[0];
    $(window).trigger("viewportToSegment", event);
  }

  
    
  var original_setCurrentSegment = UI.setCurrentSegment; 
  UI.setCurrentSegment = function(segment,closed) {
    if (config.replay == 1) {
      debug("cat.js: Skipping setting current segment in setCurrentSegment()...");
      return;
    }
    original_setCurrentSegment.call(UI, segment,closed);
  }

  var original_chooseSuggestion = UI.chooseSuggestion; 
  UI.chooseSuggestion = function(w) {
    original_chooseSuggestion.call(UI, w);
    if (config.replay != 1) {
      UI.triggerSuggestionChosen(this.currentSegment, w,
      $('.editor ul[data-item='+w+'] li.b .translation').text());
    }
  }


  var original_topReached = UI.topReached; 
  UI.topReached = function() {
    if (config.replay == 1) {
      debug("cat.js: Skipping scrolling in topReached()...");
      return;
    }
    original_topReached.call(UI);
  }

  var original_copySource = UI.copySource; 
  UI.copySource = function() {
    original_copySource.call(UI);
    var event = $.Event("sourceCopied");
    event.segment = this.currentSegment[0];
    $(window).trigger("sourceCopied", event);
  }

  var original_scrollSegment = UI.scrollSegment; 
  UI.scrollSegment = function(segment) {
    if (segment.length === 0) return;
    if (config.replay == 1) {
      debug("cat.js: Skipping scrolling in scrollSegment()...");
      return;
    }
    original_scrollSegment.call(UI, segment);
  }

  
    
});
