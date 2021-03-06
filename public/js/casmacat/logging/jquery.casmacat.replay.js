"use strict"; // strict scope for the whole file

/**
 * jQuery CASMACAT replay plugin
 *
 * Dependencies:
 *  - casmacat.logevent.js
 *  - jquery.casmacat.tools.js
 *  - diff_match_patch.js ("http://code.google.com/p/google-diff-match-patch/")
 *  - debug.js [optional]
 *
 * Supported Browsers:
 *  - Firefox >= 21
 *  - Chrome >= 22.0.1229.79 m
 *
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
            etCollect: true,  // current replay speed,
            etShowData: true,  // current replay speed,
//            etRemapAOI: false,    // will not work correctly if text/decode/etc is not replayed at the same time
//                                  // (the problem is the auto resize of the editarea)
//            etRemapAOITolerance: 20, // size of virtual border around src/tgt
            ignoreSelectionErrors: false,
            abortOnTextErrors: false,
            maxChunkSize: 5000,     // maximum size of the log list before the automatic download is triggered
            //fetchNextChunk: 500,    // how many events must be left in replayList before starting fetching of next chunk
                                    // in background, not implemented
            blockingInputZIndex: 10000,  // the CSS z-index of the div that blocks user input
            tickInterval: 200,       // specifies the interval to use for ticking (used to refresh time in UI)
            itpEnabled: true,
//            showDimensions: false,    // will probably not work correctly
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
        skipCurrentSegment = false,  // skip events of the current segment and continue on the next segment

        etXOffset = 0,
        etYOffset = 0,
        currentWidth = 0,
        currentHeight = 0,
        wOffset = 0,
        hOffset = 0,

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
        vsContents = null,      // jQuery's 'contents()' of the virtual screen
        
        gazeMap = false         // value if gaze mapping is enabled
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
                $.fn.showOverlay();
                updateUIStatus("Fast forwarding...");
                timerId = window.setTimeout(tick, 1, newTime);
            }
            else if (currentTime > newTime) {   // replay backward
                $.fn.showOverlay();
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
            debug("vsWindow: " + vsWindow);
            vsContents = $("#virtualScreen").contents();
//            settings.itpEnabled = new Boolean(vsWindow.config.enable_itp);

            currentWidth = parseInt($("#virtualScreen").prop("width"));
            currentHeight = parseInt($("#virtualScreen").prop("height"));

            $("#vsConfig").prop("disabled", "");
            $("#vsDimensions").prop("disabled", "");
            $("#vsWidth").prop("disabled", "");
            $("#vsHeight").prop("disabled", "");
            $("#etXOffset").prop("disabled", "");
            $("#etYOffset").prop("disabled", "");

            // insert virtual mouse pointer
            vsContents.find("body").append("<img id='vMousePointer' src='" + config.basepath + "public/img/casMousePointer.png'></img>");
//            vsContents.find("body").append("<div id='fixationTarget' src='" + config.basepath + "public/img/casTarget.png'></div>");
//resizeBlockingInput();
            vsReady = true;
            if (firstChunkLoaded) {
                updateUIStatus("Ready.");
            }
//            $.fn.hideOverlay();
        },

        previousEvent: function() {
            if (currentIndex > 0) {
                $.fn.showOverlay();
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
                $.fn.showOverlay();
                debug(pluginName + ": Jumping to next event...");
                updateUIStatus("Jumping to next event...");
                timerId = window.setTimeout(tick, 1, replayList[currentIndex].time);
            }
            else {
                debug(pluginName + ": No next event.");
                updateUIStatus("No next event.");
            }
        },

        setVSWidth: function() {
            wOffset = parseInt($("#vsWidth").val());
            $("#virtualScreen").prop("width", currentWidth + wOffset);
            resizeBlockingInput();
            updateUIStatus("Updated VS width.");
        },

        setVSHeight: function() {
            hOffset = parseInt($("#vsHeight").val());
            $("#virtualScreen").prop("height", currentHeight + hOffset);
            resizeBlockingInput();
            updateUIStatus("Updated VS height.");
        },

        setETOffsets: function() {
            etXOffset = $("#etXOffset").val();
            etYOffset = $("#etYOffset").val();
            updateUIStatus("Updated ET offsets.");
        },
        showGazeMap: function() {
            if(document.getElementById("showGazeMap").checked) { 
                gazeMap = true;
            } else {
                gazeMap = false;
                $('#virtualScreen').contents().find("#gold, #original, #above, #below").contents().unwrap();
            }
            document.getElementById("showGazeMap").checked = gazeMap;
        }
    };

    /*################################################################################################################*/
    /*###################################################################### Private methods/objects of the plugin ###*/
    /*################################################################################################################*/
    var generateGazeMap = function(ev, el) {
            //Dan: added background-color to character fixation      
                 $('#virtualScreen').contents().find("#gold, #original, #above, #below").contents().unwrap();
                 
                 if(gazeMap){
                 //remove old atributes
                    var textNow = el.text();
                    var textNew = '';
                    
                    debug(textNow);
                    
                    var goldOffsetFound = false;
                    
                    if(ev.character !== '' && ev.elementId !== '') {   
                    var splitT = textNow.split('');
                    for(var i = 0; i < splitT.length; i++) {
                        if(i === parseInt(ev.offset)) {
                            if(i === parseInt(ev.goldOffset) || !goldOffsetFound) {
                                textNew += '<span id="gold" style="background-color: #FF3; border: 2px solid #3C3; cursor:pointer;" >' + splitT[i] + '</span>'; 
                                goldOffsetFound = true;    
                        } else {
                                textNew += '<span id="original" style="background-color: #FF3; cursor:pointer;" onclick="goldOffset('+ i + ',' + ev.id + ')"  >' + splitT[i] + '</span>'; 
                            }
                        }
                         else if (i === parseInt(ev.belowOffset) && ev.belowChar !== ''){
                            if(i === parseInt(ev.goldOffset)) {
                                textNew += '<span id="gold" style="background-color: #3FF; border: 2px solid #3C3; cursor:pointer;" >' + splitT[i] + '</span>'; 
                                goldOffsetFound = true;
                        } else {
                                textNew += '<span id="below" style="background-color: #3FF; cursor:pointer;" onclick="goldOffset(' + i + ',' + ev.id + ')" >' + splitT[i] + '</span>';
                                }
                        } else if (i === parseInt(ev.aboveOffset) && ev.aboveChar !== ''){
                            if(i === parseInt(ev.goldOffset)) {
                                textNew += '<span id="gold" style="background-color: #F3F; border: 2px solid #3C3; cursor:pointer;" >' + splitT[i] + '</span>'; 
                                goldOffsetFound = true;
                            } else {
                                textNew += '<span id="above" style="background-color: #F3F; cursor:pointer;" onclick="goldOffset('+ i + ',' + ev.id + ')"  >' + splitT[i] + '</span>';
                            }
                        } else {
                            textNew += splitT[i];
                            }
                        }
                        if(textNew !== '')  { 
                            el.html(textNew);
                            return el;
                        }
                    }
                } 
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
//                debug(pluginName + ": Ticking for fast forward: currentTime: '" + currentTime + "', "
//                    + "nextTick: '" + nextTick + "', "
//                    + "currentIndex: '" + currentIndex + "'.");
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
//                $.fn.showOverlay();
                debug(pluginName + ": Requesting next chunk...");
                updateUIStatus("Requesting next chunk...");
                pendingRequest = loadLogChunk(false, eventCounter);
//                $.fn.hideOverlay();

                if (allChunksLoaded) {
                    if (currentIndex >= replayList.length) {    // last chunk doesn't contain any more events
                        $.fn.hideOverlay();
                        debug(pluginName + ": Finished, no more events.");
                        updateUIStatus("Finished, end of replay reached.");
                        //$("#toggleInput").prop("disabled", "");
                        isReplaying = false;
                        isPaused = false;
                        return;
                    }
                }
            }
        }
        else if (currentIndex >= replayList.length) {
            $.fn.hideOverlay();
            debug(pluginName + ": Finished, no more events.");
            updateUIStatus("Finished, end of replay reached.");
            //$("#toggleInput").prop("disabled", "");
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
            $.fn.hideOverlay();
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
                $.fn.hideOverlay();
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
            $.fn.hideOverlay();
            debug(pluginName + ": Stopping fast rewind, no more events.");
            updateUIStatus("Finished, start of replay reached.");
            currentTickTime = startTime;
            currentIndex++;
            return;
        }

        if (newTime < currentTime) {  // time still bigger, repeat ticking with newTime
            timerId = window.setTimeout(reverseTick, 1, newTime);
        }
        else if (newTime === startTime) {    // when rewinding to the first event
            timerId = window.setTimeout(reverseTick, 1, newTime);
        }
        else {
            $.fn.hideOverlay();
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
        $("#blockInput").css("top", ($("#virtualScreen").offset().top - 10) + "px");
        $("#blockInput").css("left", ($("#virtualScreen").offset().left - 10) + "px");
        $("#blockInput").height($("#virtualScreen").height() + 20);
        $("#blockInput").width($("#virtualScreen").width() + 20);
    };

    var itpSuffixChangeCall = false; var suffixChangeTime = 0;
    var lw, lh; // TODO width and height from last resize, this must become an array
    var remappedAOIFixations = [];
    var replayEvent = function(event) {

        var element = vsWindow.$(vsDocument).resolveFromElementId(event.elementId, event.xPath);

        var itpData = null;

        //alert(event.type);
        switch (event.type) {
            
            case logEventFactory.START_SESSION:
                // nothing to do here right now
                break;
            case logEventFactory.STOP_SESSION:
                // nothing to do here right now
                break;

            case logEventFactory.TEXT:
		console.log("text event");
                if (skipCurrentSegment) {
                    break;
                }
                var timespan = parseInt(event.time) - parseInt(suffixChangeTime);
                debug(pluginName + ": Time span between suffixchange (" + suffixChangeTime + ") and text (" + event.time + "): " + timespan);
                if (timespan >= 50 && itpSuffixChangeCall === true) {
                    itpSuffixChangeCall = false;
                }
                suffixChangeTime = 0;

                debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
                debug(event);

                if (itpSuffixChangeCall) {
//if (event.id == "13905162") {
//    itpSuffixChangeCall = false;
//}
//else {
                    debug(pluginName + ": Skipping text changed event because of itpSuffixChangeCall...");
                    itpSuffixChangeCall = false;
                    break;
//}
                }

                var textNow = element.text();
                var textNew = null;

                    debug(textNow);
                try {
                    if (textNow.substr(event.cursorPosition, event.deleted.length) == event.deleted) {
                        var prefix = textNow.substr(0, event.cursorPosition);
                        var postfixPos = parseInt(event.cursorPosition) + parseInt(event.deleted.length);
                        var postfix = textNow.substr(postfixPos);
                        textNew = prefix + event.inserted + postfix;
                    }
                    else {
                        throw {
                            msg: "Deleted text doesn't match stored value",
                            textNow: textNow,
                            modNow: textNow.substr(event.cursorPosition, event.deleted.length),
                            deleted: event.deleted,
                            inserted: event.inserted,
                            cursorPosition: event.cursorPosition
                        }
                    }
                }
                catch (e) {

                    element.css("border-color", "red");

                    if (settings.abortOnTextErrors === true) {
                        methods["pauseResume"]();
                        $.error("Unexpected error: '" + e.msg + "'\ntextNow: '" + e.textNow + "'\nmodNow: '" + e.modNow + "'\ndeleted: '" + e.deleted
                            + "'\ninserted: '" + e.inserted + "'\ncursorPosition: '" + e.cursorPosition + "'\n\n");
                        alert("Unexpected error: '" + e.msg + "'\ntextNow: '" + e.textNow + "'\ndeleted: '" + e.deleted
                            + "'\ninserted: '" + e.inserted + "'\ncursorPosition: '" + e.cursorPosition + "'\n\n");
                    }

                    var answer = confirm("Unexpected error: '" + e.msg + "'\ntextNow: '" + e.textNow + "'\ndeleted: '" + e.deleted
                            + "'\ninserted: '" + e.inserted + "'\ncursorPosition: '" + e.cursorPosition + "'\n\n"
                        + "This is a CRITICAL error!\n\n"
                        + "Skip current segment and continue replay?");
                    if (answer) {
                        skipCurrentSegment = true;
                    }
                }

                if (textNew != null) {  // avoid 'null' to be inserted
                    if (settings.itpEnabled) {  // set text with itp module
                        vsWindow.$("#" + event.elementId).editableItp("setTargetText", textNew);
    //                    debug(pluginName + ": Re-setting cursor to: '" + event.cursorPosition + "'");
    //                    setCursorPos(event.elementId, parseInt(event.cursorPosition) + parseInt(event.inserted.length));
                        break;
                    }

                    // set text normal
                    element.text(textNew);
                }
                debug(pluginName + ": Re-setting cursor to: '" + event.cursorPosition + "'");
                try {
                    setCursorPos(event.elementId, parseInt(event.cursorPosition) + parseInt(event.inserted.length));
                }
                catch(e) {

                    element.css("border-color", "red");

                    var answer = confirm("Unexpected error: '" + e + "'\n\n"
                        + "This is probably CRITICAL as it indicates an unrecoverable text change error!\n\n"
                        + "Skip current segment and continue replay?");
                    if (answer) {
                        skipCurrentSegment = true;
                        // fetch final translation
                        // element.text(finalTranlation);
                        // vsWindow.$("#" + event.elementId).editableItp("setTargetText", finalTranlation);
                    }
                }

                break;
            case logEventFactory.SELECTION:
//                if (settings.etRemapAOI) {
//                    debug(pluginName + ": Remapping AOI, skipping event: type: '" + event.type + "' ");
//                    break;
//                }

//                itpSuffixChangeCall = false;

                if (skipCurrentSegment) {
                    break;
                }

                debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
                debug(event);

                try {
                    var selection = vsWindow.getSelection();
                    selection.removeAllRanges();

                    var range = vsDocument.createRange();
                    var selectedNow = null;

                    var startNode = $(vsDocument).resolveFromElementId(event.startNodeId, event.startNodeXPath)[0];
                    var endNode = $(vsDocument).resolveFromElementId(event.endNodeId, event.endNodeXPath)[0];
//var startNode = window.$(event.startNodeId, vsDocument)[0];
//var endNode = window.$(event.endNodeId, vsDocument)[0];
/*debug("startNode:");
debug(startNode);
debug("endNode:");
debug(endNode);*/
                    var startOffset = parseInt(event.sCursorPosition);
                    var endOffset = parseInt(event.eCursorPosition);

                    range.setStart(startNode, startOffset);
                    range.setEnd(endNode, endOffset);

                    selection.addRange(range);
                    selectedNow = range.toString();

                    if (selectedNow != event.selectedText) {
                        throw {
                            msg: "Selected text doesn't match stored value (variant 1)",
                            now: selectedNow,
                            stored: event.selectedText
                        }
                    }
                }
                catch (e) {

                    if (settings.ignoreSelectionErrors) {
                        break;
                    }

                    debug(pluginName + ": Unexpected error: '" + e + "', stack trace: '" + e.stack + "'");
                    debug(pluginName + ": Erroneous event dump:");
                    debug(event);

                    var answer = confirm("Unexpected error: '" + e.msg + "'\nNow: '" + e.now + "'\nStored: '" + e.stored + "'\nStack trace: '" + e.stack + "'\n\n"
                        + "This is only a text range error and it is safe to continue. But it may indicate a text change error somewhere before.\n\n"
                        + "Continue replay?");
                    if (!answer) {
                        methods["pauseResume"]();
                        $.error("Unexpected error");
                    }

                    debug(pluginName + ": Selection variant 1 failed, trying variant 2...");
                    // try variant 2
                    try {
                        var selection = vsWindow.getSelection();
                        selection.removeAllRanges();

                        var range = vsDocument.createRange();
                        var selectedNow = null;

                        var startNode = $(vsDocument).resolveFromElementId(event.startNodeId, event.startNodeXPath)[0];
                        var startOffset = parseInt(event.sCursorPosition);
                        range.setStart(startNode, startOffset);
                        range.setEnd(startNode, startOffset);

                        selection.addRange(range);
                        for (var i = 0; i < event.selectedText.length; i++) {
                            selection.modify("extend", "forward", "character"); // this might also be done in the opposite direction...
                        }
                        selectedNow = selection.toString();

                        if (selectedNow != event.selectedText) {
                            throw {
                                msg: "Selected text doesn't match stored value (variant 2)",
                                now: selectedNow,
                                stored: event.selectedText
                            }
                        }
                    }
                    catch (e2) {
                        debug(pluginName + ": Selection variant 2 failed, trying variant 3...");
                        try {
                            var selection = vsWindow.getSelection();
                            selection.removeAllRanges();

                            var range = vsDocument.createRange();
                            var selectedNow = null;

                            var endNode = $(vsDocument).resolveFromElementId(event.endNodeId, event.endNodeXPath)[0];
                            var endOffset = parseInt(event.eCursorPosition);
                            range.setStart(endNode, endOffset);
                            range.setEnd(endNode, endOffset);

                            selection.addRange(range);
                            for (var i = 0; i < event.selectedText.length; i++) {
                                selection.modify("extend", "backward", "character");
                            }
                            selectedNow = selection.toString();

                            if (selectedNow != event.selectedText) {
                                throw {
                                    msg: "Selected text doesn't match stored value (variant 3)",
                                    now: selectedNow,
                                    stored: event.selectedText
                                }
                            }
                        }
                        catch (e3) {

                            debug(pluginName + ": Unexpected error: '" + e3 + "', stack trace: '" + e3.stack + "'");
                            debug(pluginName + ": Erroneous event dump:");
                            debug(event);

                            var answer = confirm("Unexpected error: '" + e3.msg + "'\nNow: '" + e3.now + "'\nStored: '" + e3.stored + "'\nStack trace: '" + e3.stack + "'\n\n"
                                + "This is only a text range error and it is safe to continue. But it may indicate a text change error somewhere before.\n\n"
                                + "Continue replay?");
                            if (!answer) {
                                methods["pauseResume"]();
                                $.error("Unexpected error");
                            }
                        }
                    }
                }
                break;

            case logEventFactory.GAZE:
                break;
            case logEventFactory.FIXATION:
                var target = null;
                if (settings.etCollect) {
                    vsContents.find("body").append("<div class='fixationTarget'></div>");
                }
                else if (vsWindow.$(".fixationTarget").length <= 0) {
                    vsContents.find("body").append("<div class='fixationTarget'></div>");
                }
                target = vsWindow.$(".fixationTarget").last();

                target.css({"left": (event.x - 10 + parseInt(etXOffset)) + "px",
                    "top": (event.y - 10 + parseInt(etYOffset) + parseInt($("#virtualScreen")[0].contentWindow.$($("#virtualScreen")[0].contentWindow).scrollTop())) + "px"});

                if (settings.etShowData) {
                    target.html("<br>" + event.x + "," + event.y + "," + event.offset + ",'" + event.character + "'");
                }
               
               element = generateGazeMap(event, element);

//                if (settings.etRemapAOI) {
//                    var src = vsWindow.$("#segment-" + vsWindow.UI.currentSegmentId + "-source");
//                    var tgt = vsWindow.$("#segment-" + vsWindow.UI.currentSegmentId + "-editarea");
//
//                    if ((src.offset().left - settings.etRemapAOITolerance) < event.x
//                        || event.x < (src.offset().left + src.width() + settings.etRemapAOITolerance)) {
//
//                        event.aoi = "currentSource";
//                        remappedAOIFixations.push(event);
//                    }
//                    else if ((tgt.offset().left - settings.etRemapAOITolerance) < event.y
//                        || event.y < (tgt.offset().left + tgt.width() + settings.etRemapAOITolerance)) {
//                        event.aoi = "currentTarget";
//                        remappedAOIFixations.push(event);
//                    }
//                }
                break;

            case logEventFactory.SCROLL:
//if (12867043 <= event.id && event.id <= 12867045) {   // just for testing
//    break;
//}
                if (event.elementId == "window") {
                    vsContents.scrollTop(event.offset);
                    debug(pluginName + ": Scrolled to: '" + event.offset + "'");
debug(event);
                }
                else {
                    // currently not needed as there are no other scrollbars
                }
                break;
            case logEventFactory.RESIZE:
                lw = currentWidth;
                lh = currentHeight;
                currentWidth = parseInt(event.width) + 17;
                currentHeight = parseInt(event.height);
                $("#virtualScreen").prop("width", currentWidth + wOffset);
                $("#virtualScreen").prop("height", currentHeight + hOffset);
                resizeBlockingInput();
                break;

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
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
                if (skipCurrentSegment) {
                    skipCurrentSegment = false;
                }

                var editarea = element.find(".editarea")[0];
                vsWindow.UI.openSegment(editarea);

                vsWindow.$(".fixationTarget").remove();  // remove older fixations

//                if (settings.showDimensions) {
////                    var segmentScrollTimer = window.setTimeout(function(e) {
//                        var src = element.find("#" + element[0].id + "-source");
//                        var tgt = element.find(".editarea");
//                        alert(element[0].id + ": " + element.width() + "x" + element.height() + " " + element.offset().left + "," + element.offset().top + "\n"
//                        + "src: " + src.width() + "x" + src.height() + " " + src.offset().left + "," + src.offset().top + "\n"
//                        + "tgt: " + tgt.width() + "x" + tgt.height() + " " + tgt.offset().left + "," + tgt.offset().top);
////                        window.clearTimeout(segmentScrollTimer);
////                    }, 501);    // 500+1 from UI.scrollSegment animate()
//                }

                debug(pluginName + ": Setting editable read-only...");
                if ($("#blockInput").css("z-index") >= 0) {
                    $(editarea).prop("contenteditable", false);
                }
                else {
                    element.focus();
                }
                break;
            case logEventFactory.SEGMENT_CLOSED:
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
                vsWindow.UI.closeSegment(element, false);
                break;
			// log translation options	
			case logEventFactory.LOADING_TRANSLATION_OPTIONS:
                //vsWindow.UI.getTranslationOptions(element);
                break;
            case logEventFactory.TRANSLATION_OPTIONS_LOADED:
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
                /*var d =  {  // pseudo return value
                    data: {
                        options: JSON.parse(event.options)
                    }
                };
                vsWindow.UI.getTranslationOptionsSuccess(d, element, element, 0, element, , ); */
                break; 
            case logEventFactory.LOADING_SUGGESTIONS:
                vsWindow.UI.getContribution(element);
                break;
            case logEventFactory.SUGGESTIONS_LOADED:
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
                var d =  {  // pseudo return value
                    data: {
                        matches: JSON.parse(event.matches)
                    }
                };
                vsWindow.UI.getContributionSuccess(d, element, element, 0, element);
                break;
            case logEventFactory.SUGGESTION_CHOSEN:
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
                if (event.which != 0) { // event.which == 0 should already been handled by getContributionSuccess()
                    vsWindow.UI.chooseSuggestion(event.which);    // should be already handled be text changed
                }
                break;
            case logEventFactory.DELETING_SUGGESTION:
                element.find(".graysmall[data-item='" + event.which + "']").remove();
                break;
            case logEventFactory.SUGGESTION_DELETED:
                break;
            case logEventFactory.STATS_UPDATED:
                vsWindow.UI.setProgress(JSON.parse(event.stats));
                break;

            case logEventFactory.DECODE:
                if (skipCurrentSegment) {
                    break;
                }

                if (vsWindow.config.catsetting === "pe") {
                    break;
                }

                itpData = JSON.parse(event.data);
                //vsWindow.$("#" + event.elementId).editableItp('trigger', "decodeResult", {errors: [], data: itpData});
                break;
            case logEventFactory.ALIGNMENTS:
                itpData = JSON.parse(event.data);
                try {   // TODO check and correct or handle this exception
                    //vsWindow.$("#" + event.elementId).editableItp('trigger', "getAlignmentsResult", {errors: [], data: itpData});
                }
                catch(e) {
                    alert(e);
                }
                break;
            case logEventFactory.SUFFIX_CHANGE:
//                if (settings.etRemapAOI) {
//                    debug(pluginName + ": Remapping AOI, skipping event: type: '" + event.type + "' ");
//                    break;
//                }

                if (skipCurrentSegment) {
                    break;
                }

                debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
                debug(event);

                if (vsWindow.config.catsetting === "pe") {
                    break;
                }

                var to = element.text();    // ITP is not working correctly. defined behaviour was, that it should only
                                            // send decode/suffixchange if something really changed. this is not the case
                                            // this hack tries to correct it
                itpData = JSON.parse(event.data);
//debug(itpData);
                //vsWindow.$("#" + event.elementId).editableItp('trigger', "setPrefixResult", {errors: [], data: itpData});

                var tn = element.text();    // ITP not working correctly, see above
                if (to !== tn) {
                    itpSuffixChangeCall = true;
//                    suffixChangeTime = event.time;
//                    debug("*** suffixChange changed something, so change time has been set to: " + suffixChangeTime);
                }
                suffixChangeTime = event.time;
//else {
//    alert("IS THIS THE PROBLEM???");
//}
                break;
            case logEventFactory.CONFIDENCES:
                itpData = JSON.parse(event.data);
                //vsWindow.$("#" + event.elementId).editableItp('trigger', "getConfidencesResult", {errors: [], data: itpData});
                break;
            case logEventFactory.TOKENS:
                itpData = JSON.parse(event.data);
                try {
                    //vsWindow.$("#" + event.elementId).editableItp('trigger', "getTokensResult", {errors: [], data: itpData});
                }
                catch (e) {
                    alert(e);
                }
                break;
            case logEventFactory.SHOW_ALIGNMENT_BY_MOUSE:
                // TODO this is still buggy (position not 100% valid)
                vsWindow.$("#vMousePointer").css({"left": (event.x - 18) + "px", "top": (event.y)+ "px"});
                /*
                vsWindow.$("#vMousePointer").css("visibility", "visible");
                vsWindow.$("#" + event.elementId).trigger('mouseenter');*/
                break;
            case logEventFactory.HIDE_ALIGNMENT_BY_MOUSE:
                // TODO this is still buggy (position not 100% valid)
                vsWindow.$("#vMousePointer").css({"left": (event.x - 18) + "px", "top": (event.y)+ "px"});
                /*
                vsWindow.$("#vMousePointer").css("visibility", "hidden");
                vsWindow.$("#" + event.elementId).trigger('mouseleave');*/
                break;
            case logEventFactory.SHOW_ALIGNMENT_BY_KEY:
//debug(pluginName + ": Replaying event: type: '" + event.type + "', time: '" + event.time + "', elementId: '" + event.elementId + "'");
//debug(event);
                /*itpData = JSON.parse(event.data);
                //vsWindow.$("#" + event.elementId).trigger('caretenter', itpData);*/
                break;
            case logEventFactory.HIDE_ALIGNMENT_BY_KEY:
                /*itpData = JSON.parse(event.data);
                //vsWindow.$("#" + event.elementId).trigger('caretleave', itpData);*/
                break;

            case logEventFactory.KEY_DOWN:
                break;
            case logEventFactory.KEY_UP:
//                if (settings.etRemapAOI) {
//                    debug(pluginName + ": Remapping AOI, skipping event: type: '" + event.type + "' ");
//                    break;
//                }

                if (skipCurrentSegment) {
                    break;
                }

                if (element.hasClass("editarea")) {
//if (settings.itpEnabled) break;
                    if (event.which == 35 || event.which == 36  // end/home
                            || event.which == 37 || event.which == 38   // left/up
                            || event.which == 39 || event.which == 40) {  // right/down
//                        debug(pluginName + ": Replaying cursor move...");
                        try {
                            setCursorPos(event.elementId, event.cursorPosition);
                        }
                        catch(e) {
                            var answer = confirm("Unexpected error: '" + e + "'\n\n"
                                + "This is probably CRITICAL as it indicates an unrecoverable text change error!\n\n"
                                + "Skip current segment and continue replay?");
                            if (answer) {
                                skipCurrentSegment = true;
                            }
                        }
                    }
                }
                break;

            case logEventFactory.MOUSE_DOWN:
                break;
            case logEventFactory.MOUSE_UP:
                break;
            case logEventFactory.MOUSE_CLICK:
//                if (settings.etRemapAOI) {
//                    debug(pluginName + ": Remapping AOI, skipping event: type: '" + event.type + "' ");
//                    break;
//                }

                if (skipCurrentSegment) {
                    break;
                }

                if (element.hasClass("editarea")) {
//if (settings.itpEnabled) break;
                    try {
                        setCursorPos(event.elementId, event.cursorPosition);
                    }
                    catch(e) {
                        var answer = confirm("Unexpected error: '" + e + "'\n\n"
                            + "This is probably CRITICAL as it indicates an unrecoverable text change error!\n\n"
                            + "Skip current segment and continue replay?");
                        if (answer) {
                            skipCurrentSegment = true;
                        }
                    }
                }
                else if (element.parents("div.editarea").get(0)) {
//if (settings.itpEnabled) break;
                    try {
                        setCursorPos(element.parents("div.editarea").prop("id"), event.cursorPosition);
                    }
                    catch(e) {
                        var answer = confirm("Unexpected error: '" + e + "'\n\n"
                            + "This is probably CRITICAL as it indicates an unrecoverable text change error!\n\n"
                            + "Skip current segment and continue replay?");
                        if (answer) {
                            skipCurrentSegment = true;
                        }
                    }
                }
//                break;    // let it slip so the pointer is moved, too
            case logEventFactory.MOUSE_MOVE:
                // TODO this is still buggy (position not 100% valid) and a performance issue (when caused throught mouse move event),
                // should not be used
                vsWindow.$("#vMousePointer").css({"left": (event.x - 18) + "px", "top": (event.y)+ "px"});
                break;

            case logEventFactory.BEFORE_COPY:
            case logEventFactory.BEFORE_CUT:
            case logEventFactory.BEFORE_PASTE:
                break;

            case logEventFactory.VIS_MENU_DISPLAYED:
                var panel = vsWindow.$(".vis-options", element);
                if (panel.is(":hidden")) {
                    vsWindow.$(".vis-button", element).next().toggle("fast");
                }
                else {
                    throw "Error: Visualization menu is already visible!";
                }
                break;
            case logEventFactory.VIS_MENU_HIDDEN:
                var panel = vsWindow.$(".vis-options", element);
                if (!panel.is(":hidden")) {
                    vsWindow.$(".vis-button", element).next().toggle("fast");
                }
                else {
                    throw "Error: Visualization menu is already hidden!";
                }
                break;

            case logEventFactory.INITIAL_CONFIG:
                // TODO use this correctly
                //alert("Warning! Using initial config not yet implemented! Set the correct configuration manually in the config.ini file.");
                debug(pluginName + ": Warning! Using initial config not yet supported! Set the correct configuration manually in the config.ini file.");
//                vsWindow.$.extend(true, vsWindow.config, JSON.parse(event.config));
                break;
            case logEventFactory.CONFIG_CHANGED:
                // TODO inform program parts about this
                var c = JSON.parse(event.config);

                for (var key in c.prefs) {

//                    c.prefs[key] = (c.prefs[key] === "true");

                    if (c.prefs["mode"] !== undefined) {
                        vsWindow.UI.toggleItp($.Event("dummy"));
                        vsWindow.config.prefs["mode"] = c.prefs["mode"];
//                        alert("ITP mode switched to: " + vsWindow.config.prefs["mode"]);
                        continue;
                    }

                    c.prefs[key] = (c.prefs[key] === "true");

                    if (c.prefs[key] !== vsWindow.config.prefs[key]) {

                        vsWindow.$("#" + event.elementId, ".editarea").editableItp("toggle", key, c.prefs[key]);
                        vsWindow.$("#" + event.elementId + "-" + key).click();
                        if (c.prefs[key] === true) {
                            vsWindow.$("#" + event.elementId + "-" + key).attr("checked", "checked");
                        }
                        else {
                            vsWindow.$("#" + event.elementId + "-" + key).attr("checked", "");
                        }
                    }
                }
                vsWindow.$.extend(true, vsWindow.config.prefs, c.prefs);

                break;

            case logEventFactory.MOUSE_WHEEL_DOWN:
//debug(event);
                element.trigger("mousewheeldown");
//alert("MOUSE_WHEEL_DOWN OVER");
                break;
            case logEventFactory.MOUSE_WHEEL_UP:
                element.trigger("mousewheelup");
                break;
            case logEventFactory.MOUSE_WHEEL_INVALIDATE:
                element.trigger("mousewheelinvalidate");
                break;
            case logEventFactory.MEMENTO_INVALIDATE:
                element.trigger("mementoinvalidate");
                break;

            // TODO probably textChange will handle these correctly, check this
            case logEventFactory.MEMENTO_UNDO:
            case logEventFactory.MEMENTO_REDO:
                break;
            // TODO do we want to replay the biconcordancer?
            case logEventFactory.BICONCOR:
                break;
            case logEventFactory.BICONCOR_CLOSED:
                break;
            case logEventFactory.BLUR:
                break;
            case logEventFactory.FOCUS:
                break;
            // interaction with ITP server
            case logEventFactory.EMIT:
                break;
            case logEventFactory.RESULT:
                itpData = JSON.parse(event.data);
                var itpError = JSON.parse(event.error);
                var itpRequest = event.request;
		console.log("RESULT", event.elementId, itpRequest, itpData);
		vsWindow.$("#" + event.elementId).editableItp('trigger', itpRequest, {errors: itpError, data: itpData});
                break;

            case logEventFactory.FLOAT_PREDICTION_SHOW:
                console.log("drawTextBox(" + event.text + ", " + event.visible + ", " + event.x + ", " + event.y + ")");
                vsWindow.$("#" + event.elementId).editableItp(
                  'trigger', 
                  'floatingPredictionShow', 
                    {errors: [], data: [event.text, event.visible, event.x, event.y]});
                break;
            case logEventFactory.FLOAT_PREDICTION_ACCEPT:
                break;
            case logEventFactory.UPDATE_SHADE_OFF_TRANSLATED_SOURCE:
                vsWindow.$("#" + event.elementId).editableItp(
                  'trigger', 
                  'updateShadeOffTranslatedSource',{}); 
                break;

            default:
                alert("Unknown event type: '" + event.type + "'.");
                debug(pluginName + ": Unknown event type: '" + event.type + "'.");
//                $.error("Unknown event type");
        }
//}
//catch (e) {
//    debug(pluginName + ": " + e);
//    debug(event);
//    $.error("Erroneous event");
//}
    };

    var revertEvent = function(event) {
        debug(pluginName + ": Reverted event dump:");
        debug(event);
        // TODO revert events
    };

    var setCursorPos = function(elementId, pos) {
//        if (settings.itpEnabled) {
//            return;
//        }
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
        updateUIStatus("Loading chunk...");

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

                    if (!isReplaying) {
                        var tempTimerId = window.setTimeout(function() {
                            updateUIStatus("Ready.");
                            window.clearTimeout(tempTimerId);
                        }, 0);
                    }

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
                    throw "(Server) Error loading 'logListChunk': '" + result.errors[0].message + "'";
                }
            },
            error: function(request, status, error) {
                xmlHttpRequest = null;

                debug(request);
                debug(status);
                debug(error);
                alert("Error loading 'logListChunk': '" + error + "'");
                throw "Error loading 'logListChunk': '" + error + "'";
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
