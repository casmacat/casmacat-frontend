"use strict"; // strict scope for the whole file

/**
 * jQuery CASMACAT replay plugin
 * Author: Ragnar Bonk
 *
 * Dependencies:
 *  - casmacat.logevent.js
 *  - jquery.casmacat.tools.js
 *  - diff_match_patch.js ("http://code.google.com/p/google-diff-match-patch/")
 *  - debug.js [optional]
 *
 * Supported Browsers:
 *  - Firefox >= 15
 *  - Chrome >= 22.0.1229.79 m
 *  - IE >= 9 (no eye tracking) (TODO needs intensive testing -> DOMSubtreeModified stuff)
 *  - Opera >= 12.02 (no eye tracking, no contentenditable)
 *
 *  TODO testing with QUnit?
 */

;(function ( $, window, document, undefined ) {

    /*#######################################################################*/
    /*################################### Private variables of the plugin ###*/
    /*#######################################################################*/

    // Create the defaults once
    var pluginName = "replayModule",
        DEFAULT_SPEED = "1.00",

        defaults = {
        // mandatory
            fileId: null, // the file id of the of the current session
            jobId: null,       // the job id of the current session
        // optional
            elementIdMode: "hybrid",    // Specifies how to identify an element E on which an event occured. Possible values
                                        // are:
                                        //
                                        // id:  only the id of E is used to identify it. This requires that all elements
                                        //      that are monitored have a unique id set, otherwise an exception is raised.
                                        //      The xPath is always null in this case.
                                        // xPath:   XPath-like syntax is used to identify E. The id is always null in this
                                        //          case.
                                        // hybrid:  this option will walk up the DOM tree until it finds an element with an
                                        //          id set. This id will be stored as the id of E. If the element with the
                                        //          id is a parent of E then the path from this parent to E is stored as an
                                        //          relative xPath
            replayEyeTracker: false,
            maxChunkSize: 5000,     // maximum size of the log list before the automatic download is triggered
            //fetchNextChunk: 500,    // how many events must be left in replayList before starting fetching of next chunk
                                    // in background, not implemented
            blockingInputZIndex: 10000,  // the CSS z-index of the div that blocks user input
            tickInterval: 200,       // specifies the interval to use for ticking (used to refresh time in UI)
            itpEnabled: true,
            isLive: false          // experimental
        },
        settings = {},  // holds the merge of the defaults and the options provided, actually the instance's settings

        isReplaying = false,    // indicates whether replaying is running
        isPaused = false,       // indicates whether paused or not
        timerId = null,         // the id of the replay timer
        replayList = [],        // holds the events to replay
        currentIndex = 0,       // current replay time
        startTime = 0,          // start time of replay
        currentTime = 0,        // current real time of clock
        currentTickTime = 0,    // current time of clock (steps)
        speed = DEFAULT_SPEED,  // current replay speed,

        pendingRequest = null,  // XmlHttpRequest object of the ajax request loading the log nextchunk
        firstChunkLoaded = false,
        allChunksLoaded = false,
        eventCounter = 0,       // counts how many events have already been fetched from the server
        playEvent = true,       // specifies wether the next tick() should play the current event
        nextTick = 0,           // holds the time of the next cal to tick()

        logEventFactory = null,

        vsReady = false,        // indicates the virtual screen (iframe) is ready for operation
        vsDocument = null,      // the native document object of the virtual screen
        vsWindow = null,        // the native window object of the virtual screen
        vsContents = null      // jQuery's 'contents()' of the virtual screen
    ; // var

    /*################################################################################################################*/
    /*#################################################################### jQuery plugin interface and namespacing ###*/
    /*################################################################################################################*/

    // The actual plugin constructor
    function ReplayModule(element, options) {
        this.element = element;

        // jQuery has an extend method that merges the contents of two or more objects, storing the result in the first
        // object. The first object is generally empty because we don't want to alter the default options for future
        // instances of the plugin (???)
        $.extend(settings, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    ReplayModule.prototype.init = function () {
        debug(pluginName + ": Initializing...");
        // Place initialization logic here. You already have access to the DOM element and the settings via the
        // instance, e.g. this.element and this.settings

        // Safari and others, like Konqueror, have not yet been tested
        if (!$.browser.opera && !$.browser.msie && !$.browser.mozilla && !$.browser.webkit) {
            alert("Your browser is not supported by this plugin!");
            $.error("Your browser is not supported by this plugin");
        }

        logEventFactory = new LogEventFactory(settings.elementIdMode);

        // initialize the blocking div
        resizeBlockingInput();
        $(window).on("resize", resizeBlockingInput);

        var storedSpeed = $.cookie("speed");
        if (storedSpeed != null && storedSpeed != DEFAULT_SPEED) {
            $("#selectSpeed").val(storedSpeed);
            methods["setSpeed"]();
        }

        // load the first chunk
        debug(pluginName + ": Loading first chunk...");
        pendingRequest = loadLogChunk(true, 0);

        debug(pluginName + ": Initialized.");
        updateUIStatus("Initialized.");
    };

    // A really lightweight plugin wrapper around the constructor, preventing against multiple instantiations
    // TODO does this also make this plugin a singleton so that there is only one log list? It is very weird, because
    // the code below seems to be 'per element', but when using a counter to count instances, this counter is
    // always 1...
    $.fn.replaying = function ( optionsOrMethod ) {

        return this.each(function () {

            // per element?
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new ReplayModule(this, optionsOrMethod));
                return null;    // otherwise an eror occurs: "Error: Method '[object Object]' does not exist on
                                // 'replayModule', thrown be the code below...
            }

            if (methods[optionsOrMethod]) {
//                debug(pluginName + ": Calling function: optionsOrMethod: '" + optionsOrMethod + "', arguments: '" + Array.prototype.slice.call(arguments, 1) + "'.");
                return methods[optionsOrMethod].apply(this, Array.prototype.slice.call(arguments, 1));
            }
            else {
                $.error("Method '" + optionsOrMethod + "' does not exist on '" + pluginName + "'"); // TODO what is the
                                                                                                    // functionality of
                                                                                                    // the '$.error()'?
                return null;    // just to satisfy the parser/compiler
            }
        });
    }

    /*################################################################################################################*/
    /*############################################################################### Public methods of the plugin ###*/
    /*################################################################################################################*/

    var methods = {
        /**
         * Call this method *after* all your 'client app' event handlers have been registered. The assumption is that
         * we're allways the last handler in the queue for the elements we're attached to...
         */
        start: function() {
            debug(pluginName + ": Starting...");
            if (!firstChunkLoaded) {
                alert("Waiting for first chunk to load!");
            }
            else if (!vsReady) {
                alert("'virtualScreen' not ready!");
            }
            else {
                debug(pluginName + ": Running in elementIdMode: '" + settings.elementIdMode + "'.");

                reset(false);   // be sure everything is on defaults
                isReplaying = true;

                $("#pauseResume").prop("disabled", "");
                $("#reset").prop("disabled", "");
                $("#start").prop("disabled", "disabled");

                timerId = window.setTimeout(tick, 0, null);

                debug(pluginName + ": Started.");
                updateUIStatus("Started.");
            }
        },

        pauseResume: function() {
            if (!isReplaying) {
                // TODO revert and restart or just restart by reload or reset and restart?
                debug(pluginName + ": Restarting...");
                updateUIStatus("Restarting...");
                methods["start"]();
            }
            else if (!isPaused) {
                pause();

                $("#timeSlider").prop("disabled", "");
                $("#currentTime").prop("disabled", "");
                $("#toggleInput").prop("disabled", "");
                $("#previousEvent").prop("disabled", "");
                $("#nextEvent").prop("disabled", "");
                updateUIStatus("Paused.");
            }
            else {
                resume();

                $("#timeSlider").prop("disabled", "disabled");
                $("#currentTime").prop("disabled", "disabled");
                $("#toggleInput").prop("disabled", "disabled");
                $("#previousEvent").prop("disabled", "disabled");
                $("#nextEvent").prop("disabled", "disabled");
                updateUIStatus("Resumed.");
            }
        },

        reset: function() {
            debug(pluginName + ": Reset...");
            reset(true);

            debug(pluginName + ": Reset.");
            updateUIStatus("Reset.");
        },

        toggleInput: function() {
            debug(pluginName + ": Toggling input...");
            if ($("#blockInput").css("z-index") > 0) {
                $("#blockInput").css("z-index", -settings.blockingInputZIndex);
                vsContents.find("input:text").each(function(index, value) {
                    $(this).prop("disabled", "");
                });
                vsContents.find("textarea").each(function(index, value) {
                    $(this).prop("disabled", "");
                });
                vsContents.find(".editarea").each(function(index, value) {
                    $(this).prop("contenteditable", "true");
                });
                updateUIStatus("Input enabled.");
             }
            else {
                $("#blockInput").css("z-index", settings.blockingInputZIndex);
                vsContents.find("input:text").each(function(index, value) {
                    $(this).prop("disabled", "disabled");
                });
                vsContents.find("textarea").each(function(index, value) {
                    $(this).prop("disabled", "disabled");
                });
                vsContents.find(".editarea").each(function(index, value) {
                    $(this).prop("contenteditable", "false");
                });
                updateUIStatus("Input disabled.");
            }
        },

        setSpeed: function() { // TODO how to write getters??
            debug(pluginName + ": Setting speed...");
            pause();
            var newSpeed = $("#selectSpeed").val();
            if (newSpeed.match("^\\d+(\\.\\d+)?$")) {
                nextTick = nextTick * speed;
                speed = newSpeed;
                nextTick = nextTick / speed;
                if (speed != DEFAULT_SPEED) {
                    $.cookie("speed", speed, { expires: new Date(new Date().getTime + 604800000) });   // one week
                }

                debug(pluginName + ": Speed changed: '" + speed + "'.");
                updateUIStatus("Speed changed.");
            }
            else {
                $("#selectSpeed").val(speed);
                updateUIStatus("Invalid speed!");
            }
            resume();
        },

        setTime: function() {
            debug(pluginName + ": Setting time...");
            // TODO check the stuff with the timeSlider value!
            var newTime = $("#currentTime").val();
            debug(pluginName + ": Time change request to: '" + newTime + "'.");

            if (currentTime < newTime) {    // replay forward
                $.fn.showProgressIndicator();
                updateUIStatus("Fast forwarding...");
                timerId = window.setTimeout(tick, 1, newTime);
            }
            else if (currentTime > newTime) {   // replay backward
                $.fn.showProgressIndicator();
                updateUIStatus("Fast rewinding...");
                currentIndex--;
                timerId = window.setTimeout(reverseTick, 1, newTime);
            }
            else {
                debug(pluginName + ": Times are equal, nothing changed.");
                updateUIStatus("Times are equal, nothing changed.");
            }
        },

        setVsReady: function() {
            debug(pluginName + ": 'virtualScreen' ready...");
            updateUIStatus("Virtual screen ready.");

            vsDocument = $("#virtualScreen")[0].contentDocument;
            vsWindow = $("#virtualScreen")[0].contentWindow;
            vsContents = $("#virtualScreen").contents();
//            settings.itpEnabled = new Boolean(vsWindow.config.enable_itp);

            vsReady = true;
            if (firstChunkLoaded) {
                updateUIStatus("Ready.");
            }
        },

        previousEvent: function() {
            if (currentIndex > 0) {
                $.fn.showProgressIndicator();
                debug(pluginName + ": Jumping to previous event...");
                updateUIStatus("Jumping to previous event...");
                currentIndex--;
                timerId = window.setTimeout(reverseTick, 1, replayList[currentIndex].time);
            }
            else {
                debug(pluginName + ": No previous event.");
                updateUIStatus("No previous event.");
            }
        },

        nextEvent: function() {
            // the possibility of an error (if that was already the last chunk) is handled in tick()
            if (currentIndex < replayList.length || !allChunksLoaded) {
                $.fn.showProgressIndicator();
                debug(pluginName + ": Jumping to next event...");
                updateUIStatus("Jumping to next event...");
                timerId = window.setTimeout(tick, 1, replayList[currentIndex].time);
            }
            else {
                debug(pluginName + ": No next event.");
                updateUIStatus("No next event.");
            }
        }
    };

    /*################################################################################################################*/
    /*###################################################################### Private methods/objects of the plugin ###*/
    /*################################################################################################################*/

    var ReplayException = function(message) {
        this.message = message;
        return this;
    };

    var tick = function(newTime) {
        updateUIStatus("Replaying...");

        window.clearTimeout(timerId);

        if (!playEvent) {   // just tick
            currentTime = currentTickTime;
//            debug(pluginName + ": Ticking for time actualisation: currentTime: '" + currentTime + "', "
//                + "nextTick: '" + nextTick + "', "
//                + "currentIndex: '" + currentIndex + "'.");
        }
        else {  // replay current event
            currentTime = replayList[currentIndex].time;
            if (newTime) {
                debug(pluginName + ": Ticking for fast forward: currentTime: '" + currentTime + "', "
                    + "nextTick: '" + nextTick + "', "
                    + "currentIndex: '" + currentIndex + "'.");
                updateUIStatus("Fast forwarding...");
            }
            else {
//                debug(pluginName + ": Ticking for event replay: currentTime: '" + currentTime + "', "
//                + "nextTick: '" + nextTick + "', "
//                + "currentIndex: '" + currentIndex + "'.");
            }

            replayEvent(replayList[currentIndex]);
            currentIndex++;
        }

        // update the UI
        $("#timeSlider").val(currentTime);
        $("#currentTime").val(currentTime);
        $("#timeOffset").val(currentTime - startTime);

        // fetch next chunk?
        if (!allChunksLoaded) {
            if (currentIndex >= replayList.length) {
//                $.fn.showProgressIndicator();
                debug(pluginName + ": Requesting next chunk...");
                updateUIStatus("Requesting next chunk...");
                pendingRequest = loadLogChunk(false, eventCounter);
//                $.fn.hideProgressIndicator();

                if (allChunksLoaded) {
                    if (currentIndex >= replayList.length) {    // last chunk doesn't contain any more events
                        $.fn.hideProgressIndicator();
                        debug(pluginName + ": Finished, no more events.");
                        updateUIStatus("Finished, end of replay reached.");
                        isReplaying = false;
                        isPaused = false;
                        return;
                    }
                }
            }
        }
        else if (currentIndex >= replayList.length) {
            $.fn.hideProgressIndicator();
            debug(pluginName + ": Finished, no more events.");
            updateUIStatus("Finished, end of replay reached.");
            isReplaying = false;
            isPaused = false;
            return;
        }

        // prepare the next tick
        if ( replayList[currentIndex].time > (currentTickTime + settings.tickInterval) && newTime == null) {    // setup next tick w/o event
            currentTickTime = currentTickTime + settings.tickInterval;
            nextTick = settings.tickInterval / speed;
            playEvent = false;
//            debug(pluginName + ": Adding time actualisation tick for next: currentTickTime: '" + currentTickTime + "', "
//                + "nextTick: '" + nextTick + "'.");
        }
        else if (currentIndex < replayList.length) {    // setup next tick w/ event
            nextTick = (replayList[currentIndex].time - currentTime) / speed;
            if (currentTickTime + settings.tickInterval == replayList[currentIndex].time) {
                currentTickTime = currentTickTime + settings.tickInterval;
            }
            playEvent = true;
//            debug(pluginName + ": Adding event tick for next: [currentIndex].time: '" + replayList[currentIndex].time + "', "
//                + "nextTick: '" + nextTick + "'.");
        }
        else {
            $.fn.hideProgressIndicator();
            debug(pluginName + ": Finished, no more events.");
            updateUIStatus("Finished, end of replay reached.");
            isReplaying = false;
            isPaused = false;
            return;
        }

        if (newTime) {
            if (currentTime < newTime) {  // time still smaller, repeat ticking with newTime
                timerId = window.setTimeout(tick, 1, newTime);
            }
            else {
                $.fn.hideProgressIndicator();
                debug(pluginName + ": Stopping fast forward...");
                updateUIStatus("Closest event reached, stopping fast forward.");
            }
        }
        else {  // run as usual
            timerId = window.setTimeout(tick, nextTick, null);
        }
    };

    var reverseTick = function(newTime) {
        window.clearTimeout(timerId);

        // replay current event
        currentTime = replayList[currentIndex].time;
        debug(pluginName + ": Ticking for fast rewind: currentTime: '" + currentTime + "', "
            + "nextTick: '" + nextTick + "', "
            + "currentIndex: '" + currentIndex + "'.");
        updateUIStatus("Fast rewinding...");

        revertEvent(replayList[currentIndex]);
        currentIndex--;

        // update the UI
        $("#timeSlider").val(currentTime);
        $("#currentTime").val(currentTime);
        $("#timeOffset").val(currentTime - startTime);

        // prepare the next tick
        if (0 <= currentIndex) {    // setup next tick w/ event
            nextTick = (replayList[currentIndex].time - currentTime) / speed;
            playEvent = true;
            debug(pluginName + ": Adding revert event tick for next: [currentIndex].time: '" + replayList[currentIndex].time + "', "
                + "nextTick: '" + nextTick + "'.");
        }
        else {
            $.fn.hideProgressIndicator();
            debug(pluginName + ": Stopping fast rewind, no more events.");
            updateUIStatus("Finished, start of replay reached.");
            currentTickTime = startTime;
            currentIndex++;
            return;
        }

        if (newTime < currentTime) {  // time still bigger, repeat ticking with newTime
            timerId = window.setTimeout(reverseTick, 1, newTime);
        }
        else if (newTime == startTime) {    // when rewinding to the first event
            timerId = window.setTimeout(reverseTick, 1, newTime);
        }
        else {
            $.fn.hideProgressIndicator();
            debug(pluginName + ": Stopping fast rewind...");
            updateUIStatus("Closest event reached, stopping fast rewind.");
            var timeOffset = parseInt($("#timeOffset").val());
            var mod = timeOffset % settings.tickInterval;
            var fac = (timeOffset - mod) / settings.tickInterval;
            currentTickTime = startTime + settings.tickInterval * fac;
            currentIndex++;
        }
    };

    var reset = function(reload) {
        window.clearTimeout(timerId);

        currentIndex = 0;
        startTime = parseInt($("#startTime").val());
        currentTime = startTime;
        currentTickTime = startTime;
        isReplaying = false;
        isPaused = false;
        $("#timeSlider").val(startTime);
        $("#currentTime").val(startTime);
        $("#timeOffset").val(0);
        playEvent = true;
        nextTick = 0;

        $("#pauseResume").prop("disabled", "disabled");
        $("#reset").prop("disabled", "disabled");
        $("#previousEvent").prop("disabled", "disabled");
        $("#nextEvent").prop("disabled", "disabled");
        $("#timeSlider").prop("disabled", "disabled");
        $("#currentTime").prop("disabled", "disabled");
        $("#start").prop("disabled", "");

        if ($("#blockInput").css("z-index") <= 0) {
            $("#blockInput").css("z-index", settings.blockingInputZIndex);
            vsContents.find("input:text").each(function(index, value) {
                $(this).prop("disabled", "disabled");
            });
            vsContents.find("textarea").each(function(index, value) {
                $(this).prop("disabled", "disabled");
            });
            vsContents.find(".editarea").each(function(index, value) {
                $(this).prop("contenteditable", "false");
            });
        }
        $("#toggleInput").prop("disabled", "disabled");

        // TODO reset UI fields, scrollbar, etc. when 'reload' is false'
        if (reload) {
            speed = DEFAULT_SPEED;
            $("#selectSpeed").val(speed);

            if (pendingRequest != null) {
                pendingRequest.abort();
            }

            firstChunkLoaded = false;
            allChunksLoaded = false;
            eventCounter = 0;
            replayList = [];
            debug(pluginName + ": Reloading first chunk...");
            pendingRequest = loadLogChunk(true, eventCounter);

            // TODO check if this always behaves like a CTRL+F5 reload
            debug(pluginName + ": Reloading 'virtualScreen'...");
            vsReady = false;
            vsWindow.location.reload(true);
        }
        else {
            vsContents.scrollTop(0);
            vsContents.find(".editarea").each(function(index, value) {
                $(this).prop("contenteditable", "false");
                $(this).html("");
            });
        }
    };

    var pause = function() {
        if (isReplaying) {
            window.clearTimeout(timerId);
            isPaused = true;
            debug(pluginName + ": Paused.");
        }
    };

    var resume = function() {
        if (isReplaying && isPaused) {
            timerId = window.setTimeout(tick, nextTick, null);
            isPaused = false;
            debug(pluginName + ": Resumed.");
        }
    };

    var resizeBlockingInput = function() {
        $("#blockInput").css("top", $("html > body > header").height());
        $("#blockInput").width($(document).width());
        $("#blockInput").height($(document).height());
    };

    var itpDecodeCall = false;
    var itpSuffixChangeCall = false;
    var lw, lh; // TODO width and height from last resize, this must become an array
    var replayEvent = function(event) {
try {
//        debug(pluginName + ": Replayed event dump:");
//        debug(event);
//        debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");

        // TODO currently only elementId mode is used here. support for hybrid mode should be added as soon as possible!
        // segment is a jQuery object
        var element = vsContents.find("#" + event.elementId);
//        var segment = vsContents.find("#" + event.elementId);
        var itpData = null;

        switch (event.type) {
            case logEventFactory.START_SESSION:
                // nothing to do here right now
                break;
            case logEventFactory.STOP_SESSION:
                // nothing to do here right now
                break;

            case logEventFactory.TEXT:
debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
debug(event);
                if (itpDecodeCall) {
                    debug(pluginName + ": Skipping text changed event because of itpDecodeCall...");
                    itpDecodeCall = false;
                    break;
                }
                else if (itpSuffixChangeCall) {
                    debug(pluginName + ": Skipping text changed event because of itpSuffixChangeCall...");
                    itpSuffixChangeCall = false;
                    break;
                }

                var textNow = element.text();
                var textNew = null;

                if (textNow.substr(event.cursorPosition, event.deleted.length) == event.deleted) {
                    var prefix = textNow.substr(0, event.cursorPosition);
                    var postfixPos = parseInt(event.cursorPosition) + parseInt(event.deleted.length);
                    var postfix = textNow.substr(postfixPos);
                    textNew = prefix + event.inserted + postfix;
                }
                else {
                    throw "Deleted text doesn't match stored value: textNow: '" + textNow + "', event.deleted: '" + event.deleted + "'";
                }

                if (settings.itpEnabled) {
                    vsWindow.$("#" + event.elementId).editableItp("setTargetText", textNew);
                    setCursorPos(event.elementId, parseInt(event.cursorPosition) + parseInt(event.inserted.length));
                    break;
                }

                element.text(textNew);
                setCursorPos(event.elementId, parseInt(event.cursorPosition) + parseInt(event.inserted.length));

                break;
            case logEventFactory.SELECTION:
debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
debug(event);

                try {
                    var selection = vsWindow.getSelection();
                    selection.removeAllRanges();

                    var range = vsDocument.createRange();
                    var selectedNow = null;

                    var startNode = $(vsDocument).resolveFromElementId(event.startNodeId, event.startNodeXPath);
                    var endNode = $(vsDocument).resolveFromElementId(event.endNodeId, event.endNodeXPath);

                    var startOffset = parseInt(event.sCursorPosition);
                    var endOffset = parseInt(event.eCursorPosition);

                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);

                    selection.addRange(range);
                    selectedNow = range.toString();

                    if (selectedNow != event.selectedText) {
                        throw {
                            msg: "Selected text doesn't match stored value",
                            now: selectedNow,
                            stored: event.selectedText
                        }
                    }
                }
                catch (e) {
                    debug(pluginName + ": Unexpected error: '" + e + "', stack trace: '" + e.stack + "'");
                    debug(pluginName + ": Erroneous event dump:");
                    debug(event);

                    var answer = confirm("Unexpected error: '" + e.msg + "'\nNow: '" + e.now + "'\nStored: '" + e.stored + "'\nStack trace: '" + e.stack + "'\n\n"
                        + "This is only a text range error and it is safe to continue. But it may indicate a text change error somewhere before.\n\n"
                        + "Continue replay?");
                    if (!answer) {
                        $.error("Unexpected error");
                    }
                }
                break;

            case logEventFactory.GAZE:
                // TODO
                break;
            case logEventFactory.FIX:
                // TODO
                break;

            case logEventFactory.SCROLL:
                if (event.elementId == "window") {
                    vsContents.scrollTop(event.offset);
                }
                else {
                    // currently not needed as there are no other scrollbars
                }
                break;
            case logEventFactory.RESIZE:
                lw = $("#virtualScreen").prop("width");
                lh = $("#virtualScreen").prop("height");
                $("#virtualScreen").prop("width", event.width);
                $("#virtualScreen").prop("height", event.height);
                break;

            // TODO log these correctly
            case logEventFactory.DRAFTED:
                vsWindow.UI.setTranslationSuccess({ data: "OK", stats: { DRAFT: -1 } },
                    element.parents("section"), "draft");
                break;
            case logEventFactory.TRANSLATED:
                vsWindow.UI.setTranslationSuccess({ data: "OK", stats: { TRANSLATED: -1 } },
                    element.parents("section"), "translated");
                break;
            case logEventFactory.APPROVED:
                // TODO
                break;
            case logEventFactory.REJECTED:
                vsWindow.UI.setTranslationSuccess({ data: "OK", stats: { REJECTED: -1 } },
                    element.parents("section"), "rejected");
                break;

            case logEventFactory.VIEWPORT_TO_SEGMENT:
                // should already be covered by scroll
                break;

            case logEventFactory.SOURCE_COPIED:
                // should already be covered by text
                break;

            case logEventFactory.SEGMENT_OPENED:
debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
debug(event);
                var editarea = element.find(".editarea")[0];
                vsWindow.UI.openSegment(editarea);

                debug(pluginName + ": Setting editable read-only...");
                if ($("#blockInput").css("z-index") >= 0) {
                    $(editarea).prop("contenteditable", false);
                }
                else {
                    element.focus();
                }
                break;
            case logEventFactory.SEGMENT_CLOSED:
debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
debug(event);
                vsWindow.UI.closeSegment(element, false);
                break;

            case logEventFactory.LOADING_SUGGESTIONS:
                vsWindow.UI.getContribution(element);
                break;
            case logEventFactory.SUGGESTIONS_LOADED:
debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
debug(event);
                var d =  {  // pseudo return value
                    data: {
                        matches: JSON.parse(event.matches)
                    }
                }
                vsWindow.UI.getContributionSuccess(d, element, element, 0, element);
                break;
            case logEventFactory.SUGGESTION_CHOSEN:
debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
debug(event);
                if (event.which != 0) { // event.which == 0 should already been handled by getContributionSuccess()
                    vsWindow.UI.chooseSuggestion(event.which);    // should be already handled be text changed
                }
                break;

            case logEventFactory.DECODE:
                itpData = JSON.parse(event.data);
                vsWindow.$("#" + event.elementId).editableItp('trigger', "decodeResult", {errors: [], data: itpData});
                itpDecodeCall = true;
                break;
            case logEventFactory.ALIGNMENTS:
                itpData = JSON.parse(event.data);
                vsWindow.$("#" + event.elementId).editableItp('trigger', "getAlignmentsResult", {errors: [], data: itpData});
                break;
            case logEventFactory.SUFFIX_CHANGE:
                itpData = JSON.parse(event.data);
                vsWindow.$("#" + event.elementId).editableItp('trigger', "setPrefixResult", {errors: [], data: itpData});
                itpSuffixChangeCall = true;
                break;
            case logEventFactory.CONFIDENCES:
                itpData = JSON.parse(event.data);
                vsWindow.$("#" + event.elementId).editableItp('trigger', "getConfidencesResult", {errors: [], data: itpData});
                break;
            case logEventFactory.TOKENS:
                itpData = JSON.parse(event.data);
                vsWindow.$("#" + event.elementId).editableItp('trigger', "getTokensResult", {errors: [], data: itpData});
                break;
            case logEventFactory.SHOW_ALIGNMENT_BY_MOUSE:
                vsWindow.$("#" + event.elementId).trigger('mouseenter');
                break;
            case logEventFactory.HIDE_ALIGNMENT_BY_MOUSE:
                vsWindow.$("#" + event.elementId).trigger('mouseleave');
                break;
            case logEventFactory.SHOW_ALIGNMENT_BY_KEY:
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
//                itpData = JSON.parse(event.data);
//                vsWindow.$("#" + event.elementId).trigger('caretenter', itpData);
//                break;
            case logEventFactory.HIDE_ALIGNMENT_BY_KEY:
//                itpData = JSON.parse(event.data);
//                vsWindow.$("#" + event.elementId).trigger('caretleave', itpData);
//                break;

            case logEventFactory.KEY_DOWN:
                break;
            case logEventFactory.KEY_UP:
                if (element.hasClass("editarea")) {
                    if (event.which == 35 || event.which == 36  // end/home
                            || event.which == 37 || event.which == 38   // left/up
                            || event.which == 39 || event.which == 40) {  // right/down
//                        debug(pluginName + ": Replaying cursor move...");
                        setCursorPos(event.elementId, event.cursorPosition);
                    }
                }
                break;

            default:
                alert("Unknown event type");
                debug(pluginName + ": Unknown event type: '" + event.type + "'.");
                $.error("Unknown event type");
        }
}
catch (e) {
debug(pluginName + ": " + e);
debug(event);
$.error("Erroneous event");
}
    };

    var revertEvent = function(event) {
        debug(pluginName + ": Reverted event dump:");
        debug(event);
        // TODO revert events
    };

    var setCursorPos = function(elementId, pos) {
        if (settings.itpEnabled) {
            return;
        }
        vsWindow.$("#" + elementId).focus();
        vsWindow.$("#" + elementId).setCursorPositionContenteditable(pos);
    };

    /**
     * Loads a log chunk either synchronous or asynchronous from the server.
     */
    var loadLogChunk = function(async, startOffset) {
        var data = {
            action: "loadLogChunk",
            jobId: settings.jobId,
            fileId: settings.fileId,
            startOffset: startOffset,
            //endOffset: startOffset + settings.maxChunkSize
            endOffset: settings.maxChunkSize
        };

        debug(pluginName + ": Loading 'logListChunk' with: jobId: '" + data.jobId + "', "
            + "fileId: '" + data.fileId + "', startOffset: '" + data.startOffset + "', endOffset: '" + data.endOffset + "'.");

        var xmlHttpRequest = $.ajax({
            async: async,
            url: config.basepath + "?action=loadLogChunk",
            data: data,
            type: "POST",
            dataType: "json",
            cache: false,
            success: function(result) {
                xmlHttpRequest = null;
                if (!firstChunkLoaded) {
                    firstChunkLoaded = true;
                    if (vsReady) {
                        updateUIStatus("Ready.");
                    }
                }

                if (result.code != null && result.code == 0) {

                    debug(pluginName + ": Loading of 'logListChunk' completed.");
                    updateUIStatus("Chunk loaded, processing data...");
                    eventCounter = eventCounter + result.data.logListChunk.length;
                    replayList.push.apply(replayList, result.data.logListChunk);

                    dumpReplayList();
                }
                else if (result.code != null && result.code == 1) {
                    debug(pluginName + ": Loading of last 'logListChunk' completed, all chunks loaded.");
                    updateUIStatus("All chunks loaded, processing data...");

//                    alert("Last 'logListChunk' load completed.");
                    if (result.data.logListChunk) {
                        debug(pluginName + ": Last 'logListChunk' length: '" + result.data.logListChunk.length + "'.");
                        eventCounter = eventCounter + result.data.logListChunk.length;
                        replayList.push.apply(replayList, result.data.logListChunk);

                        dumpReplayList();
                    }

                    if (settings.isLive) {
                        var answer = confirm("No more chunks found. Try again?");
                        if (answer) {
                            debug(pluginName + ": Trying again...");
                            updateUIStatus("Trying again...");
                            loadLogChunk(async, startOffset);
                        }
                    }

                    allChunksLoaded = true;
//                    alert("Update of 'replayList' with last 'logListChunk' completed.");
                }
                else if (result.errors) {   // TODO is the error format really like this? with the index access
                                            // 'result.errors[0]'?
                    alert("(Server) Error loading 'logListChunk': '" + result.errors[0].message + "'");
                    throw new ReplayException("(Server) Error loading 'logListChunk': '" + result.errors[0].message + "'");
                }
            },
            error: function(request, status, error) {
                xmlHttpRequest = null;

                debug(request);
                debug(status);
                debug(error);
                alert("Error loading 'logListChunk': '" + error + "'");
                throw new ReplayException("Error loading 'logListChunk': '" + error + "'");
            }
        });

        return xmlHttpRequest;
    };

    var updateUIStatus = function(msg) {
        $("#replayLog").val(msg);
    };

    var dumpReplayList = function() {
        debug(pluginName + ": 'replayList' length: '" + replayList.length + "'.");
        debug(pluginName + ": 'replayList' content dump:");
        debug(replayList);
    };

    /*################################################################################################################*/
    /*############################################################################################# Event handlers ###*/
    /*################################################################################################################*/

    // none right now

    // Just to now that everything has been parsed...
    debug(pluginName + ": Plugin codebase loaded.");

})( jQuery, window, document );
