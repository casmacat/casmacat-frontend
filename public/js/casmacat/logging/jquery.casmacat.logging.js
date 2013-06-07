"use strict"; // strict scope for the whole file

/**
 * jQuery CASMACAT logging plugin
 * Author: Ragnar Bonk
 *
 * Some parts of this script (mainly functions, follow the links provided in the comments of each funtion to find their
 * license, if any) are covered by the MIT license, the rest is GNU/GPL...
 *
 * Dependencies:
 *  - casmacat.logevent.js
 *  - jquery.casmacat.tools.js
 *  - diff_match_patch.js ("http://code.google.com/p/google-diff-match-patch/")
 *  - sanitize.js ("https://github.com/gbirke/Sanitize.js/")
 *  - debug.js [optional]
 *
 * Supported Browsers:
 *  - Firefox >= 20.0
 *  - Chrome >= 22.0.1229.79 m
 *  - IE >= 9 (no eye tracking) (TODO needs intensive testing -> DOMSubtreeModified stuff)
 *  - Opera >= 12.02 (no eye tracking, no contentenditable)
 *
 *  TODO testing with QUnit?
 */

// the semi-colon before the function invocation is a safety net against concatenated scripts and/or other plugins that
// are not closed properly. See also: "http://coding.smashingmagazine.com/2011/10/11/essential-jquery-plugin-patterns/"
;(function ( $, window, document, undefined ) {

    // undefined is used here as the undefined global variable in ECMAScript 3 and is mutable (i.e. it can be changed by
    // someone else). undefined isn't really being passed in so we can ensure that its value is truly undefined. In ES5,
    // undefined can no longer be modified.

    // window and document are passed through as local variables rather than as globals, because this (slightly)
    // quickens the resolution process and can be more efficiently minified (especially when both are regularly
    // referenced in your plugin).

    /*#######################################################################*/
    /*################################### Private variables of the plugin ###*/
    /*#######################################################################*/

    // Create the defaults once
    var pluginName = "logModule",
        defaults = {
        // mandatory
            fileId: null,               // the file id of the of the current session
            jobId: null,                // the job id of the current session
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
            logEyeTracker: false,       // should eye tracking be logged?
            etDiscardInvalid: true,     // discard gaze samples and fixations outside the tracked area (inner window area)
            etType: 0,                  // Eye Tracker to use: 0 = Mouse Emulator, 100 = EyeLink 1000, 200 = Tobii 120
            etExternalControl: false,   // will calibration and stopping of eye tracker recording be performed externally?
                                        // this (hopefully) allows to run the EyeLink application in parallel
            logKeys: true,
            logMouse: true,
            logMouseMove: false,        // should mouse movements be logged?
            logScroll: true,            // should scrolling be logged
            logScrollWindow: true,      // if the scrolling of the (document) window should be logged, this must be set
                                        // to true (this is a special case when trying to select scrollable elements)
            logResizeWindow: true,            // only affects 'window' currently
            logRootElement: document,   // event listeners will be bound to this and apropriate children (e.g. paste
                                        // events are bound to input/contenteditable), jQuery selectors maybe used
            logShortcuts: true,
            logItp: true,
            logSearchAndReplace: false,
            doSanitize: true,   // TODO check how this could be done generally (which events fires first, when multiple
                                // listeners are attached to the same event source??)
            maxChunkSize: 3000  // maximum size of the log list before the automatic upload is triggered
        },
        settings = {},  // holds the merge of the defaults and the options provided, actually the instance's settings

        isLogging = false,  // TODO add some isInit field indicating that initialization is ongoing to prevent
                            // the event handlers to fire before the plugin is completely initialized
        logList = null,
        chunksUploading = 0,
        chunkUploadCompletedInterval = 2000,

        logEventFactory = null,

        w = { width: 0, height: 0, x: 0, y: 0, positionValid: false }
    ; // var

    /*################################################################################################################*/
    /*#################################################################### jQuery plugin interface and namespacing ###*/
    /*################################################################################################################*/

    // The actual plugin constructor
    function LogModule(element, options) {
        this.element = element;

        // jQuery has an extend method that merges the contents of two or more objects, storing the result in the first
        // object. The first object is generally empty because we don't want to alter the default options for future
        // instances of the plugin (???)
        $.extend(settings, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    LogModule.prototype.init = function () {
        debug(pluginName + ": Initializing...");
        // Place initialization logic here. You already have access to the DOM element and the settings via the
        // instance, e.g. this.element and this.settings

        // Safari and others, like Konqueror, have not yet been tested
        if (!$.browser.opera && !$.browser.msie && !$.browser.mozilla && !$.browser.webkit) {
            alert("Your browser is not supported by this plugin!");
            $.error("Your browser is not supported by this plugin");
        }

//        $.fn.showOverlay();
        logEventFactory = new LogEventFactory(settings.elementIdMode);

        debug(pluginName + ": Initialized.");
    };

    // A really lightweight plugin wrapper around the constructor, preventing against multiple instantiations
    // TODO does this also make this plugin a singleton so that there is only one log list? It is very weird, because
    // the code below seems like it is 'per element', but when using a counter to count instances, this counter is
    // always 1...
    $.fn.logging = function ( optionsOrMethod ) {

        var realArgs = arguments;   // TODO otherwise it's not possible to pass arguments to functions (e.g. stop());

        return this.each(function () {

            // per element
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new LogModule(this, optionsOrMethod));
                return null;    // otherwise an error occurs: "Error: Method '[object Object]' does not exist on
                                // 'logModule', thrown by the code below...
            }

            if (methods[optionsOrMethod]) {
//                debug(pluginName + ": Calling function: optionsOrMethod: '" + optionsOrMethod + "', arguments: '" + Array.prototype.slice.call(arguments, 1) + "'.");
                return methods[optionsOrMethod].apply(this, Array.prototype.slice.call(realArgs, 1));
            }
//            else if ( typeof optionsOrMethod === 'object' || ! optionsOrMethod ) {
//                return methods.init.apply( this, arguments );
//            }
            else {
                $.error("Method '" + optionsOrMethod + "' does not exist on '" + pluginName + "'");
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
            if (isLogging) {
                alert("Log already started!");
                $.error("Log already started");
            }
            else {
                debug(pluginName + ": Running in elementIdMode: '" + settings.elementIdMode + "'.");

                if (!bindToEvents()) {  // this is necessary for 'window' position calibration
//                    return;   // TODO not necessary any more, remove this whole 'if' someday
                };
                logList = [];
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.START_SESSION, "window"));   // initialise with 'start session'
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.INITIAL_CONFIG, "window", config));   // initialise with initial configuration from config object
                windowResized();   // ... and window size
                isLogging = true;

//                $.fn.hideOverlay();
                debug(pluginName + ": Started.");
            }
        },

//        pause: function() {
//            debug(pluginName + ": Pausing...");
//        },

        stop: function(force, close) {
            debug(pluginName + ": Stopping...");
            if (!isLogging) {
                alert("Log has not been started!");
                $.error("Log has not been started");
            }
            else {
                unbindFromEvents();

                if (!force) {
                    $.fn.showOverlay("<br><br>Waiting for log chunk upload to complete...", "chunksUpload");
                    debug(pluginName + ": Waiting for log chunk upload to complete...");

                    storeLogEvent(logEventFactory.newLogEvent(logEventFactory.STOP_SESSION, window));

                    if (logList.length > 0) {
                        debug(pluginName + ": Uploading remaining 'logList'...");
                        if (chunksUploading > 0) {
                            uploadLogChunk(true);
                        }
                        else {
                            uploadLogChunk(false);
                        }
                    }

                    // wait for uploads to complete
                    if (chunksUploading > 0) {

                        var intervalId = window.setInterval(function() {
                            if (chunksUploading > 0) {
                                $("#chunksUpload").html("<br><br>Waiting for " + chunksUploading + " more chunks...");
                                debug(pluginName + ": Waiting for '" + chunksUploading + "' more chunks...");
                            }
                            else {
                                $("#chunksUpload").html("<br><br>Upload finished.");
                                window.onbeforeunload = null;
                                window.clearTimeout(intervalId);
                                logList = [];
                                isLogging = false;
//                                $.fn.hideOverlay("chunksUpload");
                                debug(pluginName + ": Stopped (upload).");
                                if (close) {
                                    closeWindow();
                                }
                            }
                        }, chunkUploadCompletedInterval);

                        return;
                    }
                }

                window.onbeforeunload = null;
                logList = [];
                isLogging = false;

                if (force) {
                    debug(pluginName + ": Stopped (force).");
                }
                else {
                    debug(pluginName + ": Stopped (normal).");
                }
            }
        }
    };

    /*################################################################################################################*/
    /*###################################################################### Private methods/objects of the plugin ###*/
    /*################################################################################################################*/

    var fieldContents = []; // holds the previous values of the fields edited
    var setFieldContents = function(element, content) {
        if (settings.elementIdMode == "xPath") {
            fieldContents[$(element).getAbsoluteXPath()] = content;
//            debug(pluginName + ": Addressed 'fieldContents' with absolute xPath: '" + $(element).getAbsoluteXPath() + "'.");
        }
        else if (settings.elementIdMode == "id") {
            if (!element.id) {
                alert("Element '" + $(element).getAbsoluteXPath() + "' has no id!'");
                $.error("Element '" + $(element).getAbsoluteXPath() + "' has no id'");
            }
            else {
                fieldContents[element.id] = content;
//                debug(pluginName + ": Addressed 'fieldContents' with element id: '" + element.id + "'.");
            }
        }
        else {  // hybrid mode
            var elementId = $(element).getElementId();
            fieldContents[elementId.id + "*" + elementId.xPath] = content;
//            debug(pluginName + ": Addressed 'fieldContents' with hybrid id: '" + elementId.id + "*" + elementId.xPath + "'.");
        }
    };

    var getFieldContents = function(element) {
        if (settings.elementIdMode == "xPath") {
//            debug(pluginName + ": Addressed 'fieldContents' with absolute xPath: '" + $(element).getAbsoluteXPath() + "'.");
            return fieldContents[$(element).getAbsoluteXPath()];
        }
        else if (settings.elementIdMode == "id") {
//            debug(pluginName + ": Addressed 'fieldContents' with element id: '" + element.id + "'.");
            return fieldContents[element.id];
        }
        else {  // hybrid mode
            var elementId = $(element).getElementId();
//            debug(pluginName + ": Addressed 'fieldContents' with hybrid id: '" + elementId.id + "*" + elementId.xPath + "'.");
            return fieldContents[elementId.id + "*" + elementId.xPath];
        }
    };

    var calibrateWindowPosition = function() {

        if (w.positionValid) {
            debug(pluginName + ": Already calibrated, returning...");
            return;
        }

//        debug(pluginName + ": Calibrating 'window' position...");
        if (typeof window.mozInnerScreenX !== "undefined" && typeof window.mozInnerScreenY !== "undefined") {
            // TODO "The Components object is deprecated. It will soon be removed."
            var queryInterface = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
            var domWindowUtils = queryInterface.getInterface(Components.interfaces.nsIDOMWindowUtils);
            var cssPixelFactor = domWindowUtils.screenPixelsPerCSSPixel;

            w.x = window.mozInnerScreenX * cssPixelFactor;
            w.y = window.mozInnerScreenY * cssPixelFactor;
            w.positionValid = true;
            debug(pluginName + ": 'window' position: w.x: '" + w.x + "', w.y: '" + w.y + "'.");
        }
        else {
            $.fn.showOverlay("<br><br>Please calibrate the 'window' position by moving the mouse over this area...", "windowCalibrator");

            $(window).on("mousemove." + pluginName + "_temp", function(e) {
//                debug(pluginName + ": Mouse moved, calculating 'window' position...");
                w.x = e.screenX - e.clientX;
                w.y = e.screenY - e.clientY;
                w.positionValid = true;
                debug(pluginName + ": 'window' position: w.x: '" + w.x + "', w.y: '" + w.y + "'.");

                $(window).off("mousemove." + pluginName + "_temp");
                $.fn.hideOverlay("windowCalibrator");

//                if (!isLogging) {   // call start() again
//                    debug(pluginName + ": Calling 'start()' again...");
//                    methods["start"]();
//                }
            });
         }
    };

    var bindToEvents = function() {
        debug(pluginName + ": Binding to events...");

//        $(window).on("onbeforeunload." + pluginName, windowClose);
        window.onbeforeunload = windowClose;    // TODO jQuery seems not to work correctly for this

        // attach eye tracker
        if (settings.logEyeTracker) {
            var plugin = $.fn.getETPlugin();
            if (plugin.valid) {
                debug(pluginName + ": Plugin is valid.");

                calibrateWindowPosition();
//                if (!w.positionValid) {
//                    debug(pluginName + ": Returning from 'bindToEvents()' because 'window' position is not yet calibrated...");
//                    return false;
//                }

                $.fn.attachToETPluginEvent(plugin, "state", state);
                $.fn.attachToETPluginEvent(plugin, "gaze", gaze);
                $.fn.attachToETPluginEvent(plugin, "fixation", fixation);

                plugin.setDeviceAndConnect(settings.etType);

                if (!settings.etExternalControl) {
                    while (!plugin.calibrate()) {
                        var answer = confirm("Calibration failed, trying again?");
                        if (!answer) {
                            alert("Calibration failed, logging aborted!");
                            $.error("Calibration failed, logging aborted!");
    //                        return;
                        }
                    }
                }

                plugin.start();
            }
            else {
                settings.logEyeTracker = false;
                alert("Eye tracking plugin is not valid!");
                debug(pluginName + ": Eye tracking plugin is not valid!");
//                $.error("Eye tracking plugin is not valid");
            }
        }

        // attach to mouse events
        // attach even, if settings.logMouse is false due to logging selections and removing
        // multiple selection stuff of FF
        if (settings.logMouseMove) { // log mouse movements only if desired
            $(settings.logRootElement).on("mousemove." + pluginName, mouseMove);
        }
//        $(settings.logRootElement).on("mouseleave." + pluginName, mouseLeave);
//        $(settings.logRootElement).on("mousedown." + pluginName, mouseDown); // fires first
//        $(settings.logRootElement).on("mouseup." + pluginName, mouseUp); // fires second
//        $(settings.logRootElement).on("click." + pluginName, mouseClick); // fires last
        $(settings.logRootElement).each(function(index, value) {
            $(this).on("mouseleave." + pluginName, mouseLeave);
            $(this).on("mousedown." + pluginName, mouseDown); // fires first
            $(this).on("mouseup." + pluginName, mouseUp); // fires second
            $(this).on("click." + pluginName, mouseClick); // fires last
        });

        // attach to key events
        // attach even, if settings.logKeys is false due to logging selections and removing
        // multiple selection stuff of FF
        $(settings.logRootElement).each(function(index, value) {
            $(this).on("keydown." + pluginName, keyDown); // fires first
        //$(document).keypress(keyPress);   // fires second and may repeat, not covered by any official
                                            // specification, cross browser behavior differs, but luckily it seems
                                            // not to be needed :-)
            $(this).on("keyup." + pluginName, keyUp); // fires last
        });

        // TODO problems with opera with on{paste, cut, copy}
        // attach to cut
        $(settings.logRootElement).find("input:text").on("cut." + pluginName, beforeCut);
        $(settings.logRootElement).find("textarea").on("cut." + pluginName, beforeCut);
        $(settings.logRootElement).find(".editarea").on("cut." + pluginName, beforeCut);

        // attach to copy
        /*$(settings.logRootElement).find("input:text").on("copy." + pluginName, beforeCopy);
        $(settings.logRootElement).find("textarea").on("copy." + pluginName, beforeCopy);
        $(settings.logRootElement).find(".editarea").on("copy", beforeCopy);*/
        $(settings.logRootElement).on("copy", beforeCopy);

        // attach to paste
        $(settings.logRootElement).find("input:text").on("paste." + pluginName, beforePaste);
        $(settings.logRootElement).find("textarea").on("paste." + pluginName, beforePaste);
        $(settings.logRootElement).find(".editarea").on("paste", beforePaste);

        // attach to input (happens after the content changed)
        $(settings.logRootElement).find("input:text").each(function(index, value) {
            setFieldContents(this, $(this).val());
            $(this).on("input." + pluginName, textChanged);

            // this is needed in order to track selections properly
            $(this).on("mouseleave." + pluginName, mouseLeave);
            $(this).on("mousedown." + pluginName, mouseDown); // fires first
            $(this).on("mouseup." + pluginName, mouseUp); // fires second

//            debugAttachedTo("input:text", this);
        });
        $(settings.logRootElement).find("textarea").each(function(index, value) {
            setFieldContents(this, $(this).val());
            $(this).on("input." + pluginName, textChanged);

//            debugAttachedTo("textarea", this);
        });
        $(settings.logRootElement).find(".editarea").each(function(index, value) {  // TODO not working
                                                                                    // in opera
            if (!$(this).is("div")) {
                alert("Only 'div' with 'contenteditable=true' is supported!");
                $.error("Only 'div' with 'contenteditable=true' is supported");
            }

            // TODO check, if the 'div' has 'white-space: pre-wrap;', but is this real needed? 'pre-wrap' means that
            // whitespaces are preserved by the browser. Text will wrap when necessary, and on line breaks. Only 'pre'
            // seems to be bad idea because it prevents automatic linebreaks!
            if ($(this).css("white-space") != "pre-wrap") {
                alert("Warning: Detected a 'div' without 'white-space: pre-wrap;'. This may lead to unwanted "
                    + "behavior!");
            }

            setFieldContents(this, $(this).text());
            if ($.browser.msie) {   // Special treatment for IE needed, because DOMSubtreeModified fires on user AND on
                                    // programmatic changes, see textChanged()
                $(this).on("DOMSubtreeModified." + pluginName, textChanged);
            }
            else if ($.browser.opera) { // TODO fix this in the future when Opera supports 'oninput'/
                                        // 'DOMSubtreeModified' or implement something manually with 'onkeydown' stuff
                alert("Opera doesn't support 'oninput'/'DOMSubtreeModified' for 'contenteditable=true'!");
                $.error("Opera doesn't support 'oninput'/'DOMSubtreeModified' for "
                    + "'contenteditable=true'");
            }
            else {
                $(this).on("input." + pluginName, textChanged);
            }

//            debugAttachedTo("contenteditable=true", this);
        });

        // attach to scroll events
        if (settings.logScroll) {
            // TODO define which elements to watch -> attach to all scrollable elements and/or only particular defined
            // elements? Current behavior is to attach to all children of 'logRootElement' that actually have a
            // scrollbar. How about elements that may get one later?
            $(settings.logRootElement).find(":scrollable(vertical)").each(function(index, value) {
                // special case, attach to window, is ignored here, see below
                if ($(this).is("html") && !settings.logScrollWindow) {
                    debug(pluginName + ": Attaching to 'window' ignored (use 'logScrollWindow=true' to enable "
                        + "this).");
                }

                $(this).on("scroll." + pluginName, scrollableMoved);

//                debugAttachedTo("scrollable(vertical)", this);
            });

            // special case, attach to window scrolling if specified in settings
            if (settings.logScrollWindow) {
                $(window).on("scroll." + pluginName, scrollableMoved);
//                debugAttachedTo("scroll", window);
            }
        }

        // attach to resize events of 'window'
        if (settings.logResizeWindow) {
            $(window).on("resize." + pluginName, windowResized);
//            debugAttachedTo("resize", window);
        }

        // attach to shortcut events
        if (settings.logShortcuts) {

            // TODO log those correctly: drafted, translated, approved, rejected
            $(window).on("drafted." + pluginName, drafted);
//            debugAttachedTo("drafted", window);

            $(window).on("translated." + pluginName, translated);
//            debugAttachedTo("translated", window);

            $(window).on("approved." + pluginName, approved);
//            debugAttachedTo("approved", window);

            $(window).on("rejected." + pluginName, rejected);
//            debugAttachedTo("rejected", window);

            $(window).on("viewportToSegment." + pluginName, viewportToSegment);
//            debugAttachedTo("viewportToSegment", window);

            $(window).on("sourceCopied." + pluginName, sourceCopied);
//            debugAttachedTo("sourceCopied", window);

            $(window).on("segmentOpened." + pluginName, segmentOpened);
//            debugAttachedTo("segmentOpened", window);

            $(window).on("segmentClosed." + pluginName, segmentClosed);
//            debugAttachedTo("segmentClosed", window);

            $(window).on("loadingSuggestions." + pluginName, loadingSuggestions);
//            debugAttachedTo("loadingSuggestions", window);

            $(window).on("suggestionsLoaded." + pluginName, suggestionsLoaded);
//            debugAttachedTo("suggestionsLoaded", window);

            $(window).on("suggestionChosen." + pluginName, suggestionChosen);
//            debugAttachedTo("suggestionChosen", window);

            $(window).on("deletingSuggestion." + pluginName, deletingSuggestion);
//            debugAttachedTo("deletingSuggestion", window);

            $(window).on("suggestionDeleted." + pluginName, suggestionDeleted);
//            debugAttachedTo("suggestionDeleted", window);
        }

        // Monitor statistic changes
        $(window).on("statsUpdated." + pluginName, statsUpdated);

        if (settings.logItp) {
            $(window).on("translationChanged." + pluginName, translationChanged);

            $(window).on("showAlignmentByMouse." + pluginName, alignmentShownByMouse);
            $(window).on("hideAlignmentByMouse." + pluginName, alignmentHiddenByMouse);
            $(window).on("showAlignmentByKey." + pluginName, alignmentShownByKey);
            $(window).on("hideAlignmentByKey." + pluginName, alignmentHiddenByKey);

            $(window).on("visMenuDisplayed." + pluginName, visMenuDisplayed);
            $(window).on("visMenuHidden." + pluginName, visMenuHidden);
            $(window).on("configChanged." + pluginName, configChanged);

            $(window).on("mouseWheelUp." + pluginName, mouseWheelCommon);
            $(window).on("mouseWheelDown." + pluginName, mouseWheelCommon);
            $(window).on("mouseWheelInvalidate." + pluginName, mouseWheelCommon);

            $(window).on("mementoUndo." + pluginName, mementoCommon);
            $(window).on("mementoRedo." + pluginName, mementoCommon);
            $(window).on("mementoInvalidate." + pluginName, mementoCommon);
        }

        if (settings.logSearchAndReplace) {
            $(window).on("srMenuDisplayed." + pluginName, srCommon);
            $(window).on("srMenuHidden." + pluginName, srCommon);
            $(window).on("matchCaseOn." + pluginName, srCommon);
            $(window).on("matchCaseOff." + pluginName, srCommon);
            $(window).on("isRegExpOn." + pluginName, srCommon);
            $(window).on("isRegExpOff." + pluginName, srCommon);

            $(window).on("srRulesSetting." + pluginName, srCommon);
            $(window).on("srRulesSet." + pluginName, srCommon);
            $(window).on("srRulesApplied." + pluginName, srCommon);
            $(window).on("srRuleDeleted." + pluginName, srCommon);

            // TODO this one is found by find(scrollable(vertical) but no event is attached. why?
            $("#sr-rules").on("scroll." + pluginName, scrollableMoved);
        }

        $(window).on("statsUpdated." + pluginName, statsUpdated);

        debug(pluginName + ": Bound to events.");
        return true;    // TODO is this still necessary for 'window' position calibration?
    };

    var unbindFromEvents = function() {
        debug(pluginName + ": Unbinding from events...");

        // TODO check this for completeness/correctness
        if (settings.logEyeTracker) {
            var plugin = $.fn.getETPlugin();
            if (plugin.valid) {
                if (!settings.etExternalControl) {
                    plugin.stop();
                }
                $.fn.detachFromETPluginEvent(plugin, "state", state);
                $.fn.detachFromETPluginEvent(plugin, "gaze", gaze);
                $.fn.detachFromETPluginEvent(plugin, "fixation", fixation);
            }
        }

        // input stuff
        $(settings.logRootElement).find("input:text").off("." + pluginName);
        $(settings.logRootElement).find("textarea").off("." + pluginName);
        $(settings.logRootElement).find("*[contenteditable=true]." + pluginName).off("." + pluginName);

        // key/mouse
        $(settings.logRootElement).off("." + pluginName);

        // scroll
        $(settings.logRootElement).find(":scrollable(vertical)").off("." + pluginName);

        // (window) scroll + resize + segment
        $(window).off("." + pluginName);

//        window.onbeforeunload = null;

        fieldContents = [];   // clear field contents cache
        debug(pluginName + ": Unbound from events.");
    };

    /**
     * Stores an event in the loglist. When the size of the logList exceeds the maximum specified, it is first
     * (asynchronously) uploaded and cleared and then the new event is added.
     *
     * TODO Will this later also be used to control pausing of the logging (additional variable that is checked)?
     */
    var storeLogEvent = function(logEvent) {

        if (logList.length >= settings.maxChunkSize) {
            debug(pluginName + ": Forcing upload of 'logList'...");
            uploadLogChunk(true);
//            uploadLogChunk(logList, true);
//            logList.length = 0;   // clear the logList, this leads to '1x undefined' when debug(logList) is called
                                    // (where the '1' is the value of maxChunkSize - 1)
            logList = []; // clear the logList
        }
//        else if (logList.length === parseInt(settings.maxChunkSize * 0.25)) {
//            debug(pluginName + ": 'logList' fill level 25%: '" + logList.length + "'.");
//        }
        else if (logList.length === parseInt(settings.maxChunkSize * 0.50)) {
            debug(pluginName + ": 'logList' fill level 50%: '" + logList.length + "'.");
        }
//        else if (logList.length === parseInt(settings.maxChunkSize * 0.75)) {
//            debug(pluginName + ": 'logList' fill level 75%: '" + logList.length + "'.");
//        }

        logList.push(logEvent);
//        debug(pluginName + ": 'logList' now contains '" + logList.length + "' events.");
    };

    /**
     * Uploads a log chunk either synchronous (when logging is stopped) or asynchronous (while logging is still running)
     * to the server.
     */
    var uploadLogChunk = function(async) {
//    var uploadLogChunk = function(logList, async) {

        var startTime = new Date().getTime();
//        debug(pluginName + ": 'logList' refers to: jobId: '" + jobId + "', settings.fileId: '" + settings.jobId + "'.");

        var internalLogList = logList;
//        debug(pluginName + ": 'internalLogList' content dump:");
//        for (var key in internalLogList) {
//            if (internalLogList.hasOwnProperty(key)) {
//                debug(internalLogList[key]);
//            }
//        }

        var data = {
            action: "saveLogChunk",
            fileId: settings.fileId,
            jobId: settings.jobId,
            logList: JSON.stringify(internalLogList)
//            logList: logList
        };

        chunksUploading++;
        debug(pluginName + ": Currently uploading '" + chunksUploading + "' chunks...");

        $.ajax({
            async: async,
            url: config.basepath + "?action=saveLogChunk",
            data: data,
            type: "POST",
            dataType: "json",
            cache: false,
            success: function(result) {
                chunksUploading--;
                if (result.data && result.data === "OK") {
                    var executionTime = new Date().getTime() - startTime;
                    debug(pluginName + ": Upload of 'logList' completed, executionTime: '" + executionTime + "', (server) executionTime: '" + result.executionTime + "'.");
                }
                else if (result.errors) {    // TODO is the error format really like this? with the index access
                                            // 'result.errors[0]'?
                    alert("(Server) Error uploading 'logList': '" + result.errors[0].message + "'");
                    alert("(Server) Error uploading 'logList': '" + result.errors[0].message + "'");
                    $.error("(Server) Error uploading 'logList': '" + result.errors[0].message + "'");
                }
            },
            error: function(request, status, error) {
                chunksUploading--;
                debug(request);
                debug(status);
                debug(error);
                debug(pluginName + ": 'internalLogList' content dump:");
                for (var key in internalLogList) {
                    if (internalLogList.hasOwnProperty(key)) {
                        debug(internalLogList[key]);
                    }
                }
//                debug(data.logList);
                alert("Error uploading 'logList': '" + error + "'");
                $.error("Error uploading 'logList': '" + error + "'");
            }
        });
    };

    var closeWindow = function() {
        window.open("", "_self", "");
        window.close();
    };

    var debugAttachedTo = function(type, element) {
        if (!element.tagName || element.tagName.toLowerCase() === "html") {
            debug(pluginName + ": Attached to '" + type + "' (id: 'window', xPath: '').");
        }
        else if (settings.elementIdMode === "xPath") {
            debug(pluginName + ": Attached to '" + type + "' (id: '', xPath: '" + $(element).getAbsoluteXPath()
                + "').");
        }
        else if (settings.elementIdMode === "id") {
            debug(pluginName + ": Attached to '" + type + "' (id: '" + element.id + "', xPath: '').");
        }
        else {  // hybrid mode
            var elementId = $(element).getElementId();
            debug(pluginName + ": Attached to '" + type + "' (id: '" + elementId.id + "', xPath: '" + elementId.xPath
                + "').");
        }
    };

    var dumpEvent = function(event) {
        debug(pluginName + ": Event dump:");
        debug(event);
    };

    /**
     * Logs a selection event if the selected text is not empty.
     */
    var logSelectionEvent = function(element) {
        var range = $(element).getSelection();

        if (range !== null) {
//        if (range.selectedText !== "") {
            debug(pluginName + ": Logging selection...");
            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SELECTION, element, range));
        }
        else {
//            debug(pluginName + ": Ignoring empty selection.");
        }
    };

    var mouseCommon = function(type, e) { // helper function that logs a mouse-whatever event

        if (!e.originalEvent) { // ignore programmatic clicks
            debug(pluginName + ": Ignoring programmatic mouse event: type: '" + type + "'.");
            return;
        }

        var target = null;
        if ($(e.target).hasClass("editarea")) {
            target = e.target;
        }
        else if ($(e.target).parents("div.editarea").get(0)) {
            target = $(e.target).parents("div.editarea").get(0);
        }

        var pos = -1;
        if (target !== null) {
            pos = $(target).getCursorPositionContenteditable();
        }
//        debug(pluginName + ": Mouse event: type: '" + type + "', cursor position: pos: '" + pos + "'.");

        var altKey = false;
        if (e.altKey) {
            altKey = e.altKey;
        }

        storeLogEvent(logEventFactory.newLogEvent(type, e.target,
            e.which, e.clientX, e.clientY, shiftKey, ctrlKey, e.altKey, pos));
    };

    /*################################################################################################################*/
    /*############################################################################################# Event handlers ###*/
    /*################################################################################################################*/

//    var onDownElementId = null;    // the element on which the mousedown/the first keydown occured
    var keysDown = [];

    var windowClose = function(e) {
        debug(pluginName + ": Window closed.");

        var msg = "Upload of log data is still in progress. Please CANCEL this dialog now and wait until the upload is finished."
            + "The page will then close automatically.\n\nDo you really want to abort the upload and loose the data?";

        if (!isLogging && chunksUploading > 0) {
            debug(pluginName + ": Window close called while still uploading, notifying user again...");
            return msg; // let user cancel
        }

        methods["stop"](false, true);

        if (chunksUploading > 0) {
            return msg; // let user cancel
        }
    };

    var mouseLeave = function(e) {
//        debug(pluginName + ": Mouse leave.");
        if (e.which != 0) {
            logSelectionEvent(e.target);
        }
    };

    var mouseDown = function(e) {
//        debug(pluginName + ": Mouse down.");

        if (e.ctrlKey) {  // do not allow CTRL for selecting text, this prevents multiple selections in Firefox
                        // TODO is it possibly to disable that by another way, like document.execCommand()?
                        // best would be that, of course: "https://bugzilla.mozilla.org/show_bug.cgi?id=753718"
            e.preventDefault();
            debug(pluginName + ": Mouse down: Blocking multiple selections...");
        }

        if (e.shiftKey) {  // do not allow SHIFT + mouse movement to select/move text
                        // TODO is it possibly to disable that by another way, like document.execCommand()?
            e.preventDefault();
            debug(pluginName + ": Mouse down: Blocking selection movements...");
        }

        if (settings.logMouse) {
            mouseCommon(logEventFactory.MOUSE_DOWN, e);
        }
    };

    var mouseUp = function(e) {
//        debug(pluginName + ": Mouse up.");

//        if ($(onDownElementId).hasParentIn(settings.logRootElement)
//            && $(e.target).hasParentIn(settings.logRootElement)) {
//
//        }

        // TODO manage selections correctly
        if (!e.shiftKey) {
            logSelectionEvent(e.target);
        }

        if (settings.logMouse) {
            mouseCommon(logEventFactory.MOUSE_UP, e);
        }
    };

    var mouseClick = function(e) {
//        debug(pluginName + ": Mouse clicked.");

        if (settings.logMouse) {
            mouseCommon(logEventFactory.MOUSE_CLICK, e);
        }
    };

    var mouseMove = function(e) {
//        debug(pluginName + ": Mouse moved.");

        mouseCommon(logEventFactory.MOUSE_MOVE, e);
    };

    var shiftKey = false;
    var ctrlKey = false;
    var keyDown = function(e) {
        if (!keysDown[e.keyCode]) { // do not repeat the debug output
            keysDown[e.keyCode] = true;
//            debug(pluginName + ": Key down.");
        }

        if (e.shiftKey) {
            shiftKey = e.shiftKey;
        }

        if (e.ctrlKey) {
            ctrlKey = e.ctrlKey;
        }

        if (settings.logKeys) {
            var pos = $(e.target).getCursorPositionContenteditable();
//            debug(pluginName + ": Key down, cursor position: pos: '" + pos + "'.");

            var altKey = false;
            if (e.altKey) {
                altKey = e.altKey;
            }

            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.KEY_DOWN, e.target,
                pos, e.which, $.fn.keyCodeToKey(e.which), shiftKey, ctrlKey, altKey));
        }
    };

//    var keyPressed = function(e) {
//        debug(pluginName + ": Key event: pressed");
//    };

    var keyUp = function(e) {
        keysDown[e.keyCode] = false;
//        debug(pluginName + ": Key up.");

        if (ctrlKey && !e.ctrlKey) {
            ctrlKey = false;
        }

        // TODO manage selections correctly
        if (shiftKey && !e.shiftKey) {
            logSelectionEvent(e.target);
            shiftKey = false;
        }

        if (settings.logKeys) {
            var pos = $(e.target).getCursorPositionContenteditable();
//            debug(pluginName + ": Key up, cursor position: pos: '" + pos + "'.");

            var altKey = false;
            if (e.altKey) {
                altKey = e.altKey;
            }

            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.KEY_UP, e.target,
                pos, e.which, $.fn.keyCodeToKey(e.which), shiftKey, ctrlKey, altKey));
        }
    };

    var contentBeforeCut = null;
    var beforeCut = function(e) {  // TODO how about CTRL+C or CTRL+V?
//        debug(pluginName + ": Cut.");

        if (e.target.hasAttribute("contenteditable")) {
            contentBeforeCut = $(e.target).text();
        }
        else {
            contentBeforeCut = $(e.target).val();
        }

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.BEFORE_CUT, e.target));
    };

    var beforeCopy = function(e) {  // TODO how about CTRL+X or CTRL+V?
//        debug(pluginName + ": Copy.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.BEFORE_COPY, e.target));
    };

    var pasted = false;
    var contentBeforePaste = null;
    var beforePaste = function(e) {  // TODO how about CTRL+X or CTRL+C?
//        debug(pluginName + ": Paste.");

        pasted = true;

        if (e.target.hasAttribute("contenteditable")) {
            contentBeforePaste = $(e.target).text();
        }
        else {
            contentBeforePaste = $(e.target).val();
        }

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.BEFORE_PASTE, e.target));
    };

    // called on 'input'
    var textChanged = function(e) {

        if ($.browser.msie && e.originalEvent.srcElement) {
            debug(pluginName + ": Ignoring programmatic change (IE 'DOMSubtreeModified' workaround).");
            return;
        }

        var changes = null; // holds the diff

        // calculate diff and update field content to the new value
        if (e.target.hasAttribute("contenteditable")) {

            // sanitize if needed
            if (settings.doSanitize && pasted) {
                if (settings.logItp) {
//                    $(e.target).sanitizeHTML(false);
                }
                else {
                    $(e.target).sanitizeHTML(true);
                }
            }

            if (getFieldContents(e.target) != $(e.target).text()) {
                changes = $.fn.getChanges( getFieldContents(e.target), $(e.target).text() );

//                debug(pluginName + ": Text changed: "
//                    + "\n\told text: '" + getFieldContents(e.target) + "', "
//                    + "\n\tnew text: '" + $(e.target).text() + "', "
//                    + "\n\tdiff: (cursorPosition: '" + changes.cursorPosition + "', deleted: '" + changes.deleted
//                        + "', inserted: '" + changes.inserted + "').");

                setFieldContents(e.target, $(e.target).text());
            }
        }
        else {
            // textarea needs no sanitize
            changes = $.fn.getChanges( getFieldContents(e.target), $(e.target).val() );
//            debug(pluginName + ": Text changed: "
//                + "\n\told text: '" + getFieldContents(e.target) + "', "
//                + "\n\tnew text: '" + $(e.target).val() + "', "
//                + "\n\tdiff: (cursorPosition: '" + changes.cursorPosition + "', deleted: '" + changes.deleted
//                    + "', inserted: '" + changes.inserted + "').");
            setFieldContents(e.target, $(e.target).val());
        }

        // write log event if changes detected
        if (changes) {
//            debug(pluginName + ": Text changed.");
            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.TEXT, e.target,
                changes.cursorPosition, changes.deleted, changes.inserted));

            // (re-)set cursor position (because of sanitize)
            if (settings.doSanitize && pasted) {
                pasted = false;
                if (settings.logItp) {
//                    var pos = changes.cursorPosition + changes.inserted.length;
//                    debug(pluginName + ": Re-setting cursor position: '" + pos + "'.");
//                    $(e.target).setCursorPositionContenteditable(pos);
                }
                else {
                    var pos = changes.cursorPosition + changes.inserted.length;
                    debug(pluginName + ": Re-setting cursor position: '" + pos + "'.");
                    $(e.target).setCursorPositionContenteditable(pos);
                }
            }
        }
        else {
//            debug(pluginName + ": Text changed: No changes detected.");
        }
    };

    var scrollableMoved = function(e) {
        debug(pluginName + ": Scroll moved.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SCROLL, e.target, $(e.target).scrollTop()));
    };

    //var lw = -1, lh = -1; // width and height from last resize
    var windowResized = function(e) {

        if ( w.width !== $(window).width() && w.height !== $(window).height()) {
            debug(pluginName + ": Window resized.");
            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.RESIZE, window,
                $(window).width(), $(window).height()));
            w.width = $(window).width();
            w.height = $(window).height();

            if (isLogging) {
                w.positionValid = false;
                calibrateWindowPosition();
            }
        }
        else {
//            debug(pluginName + ": Window resize ignored.");
        }
    };

    var drafted = function(e, data) {
        debug(pluginName + ": Segment drafted.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.DRAFTED, data.segment));
    };

    var translated = function(e, data) {
        debug(pluginName + ": Segment translated.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.TRANSLATED, data.segment));
    };

    var approved = function(e, data) {
        debug(pluginName + ": Segment approved.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.APPROVED, data.segment));
    };

    var rejected = function(e, data) {
        debug(pluginName + ": Segment rejected.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.REJECTED, data.segment));
    };

    var viewportToSegment = function(e, data) {
        debug(pluginName + ": Viewport moved to segment.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.VIEWPORT_TO_SEGMENT, data.segment));
    };

    var sourceCopied = function(e, data) {
        debug(pluginName + ": Segment source copied.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SOURCE_COPIED, data.segment));

        textChanged({
             target: $(".editarea", data.segment)[0]
         });
    };

    var segmentOpened = function(e, data) {
        debug(pluginName + ": Segment opened: '" + data.segment.id + "'.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SEGMENT_OPENED, data.segment));
    };

    var segmentClosed = function(e, data) {
        debug(pluginName + ": Segment closed: '" + data.segment.id + "'.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SEGMENT_CLOSED, data.segment));
    };

    var loadingSuggestions = function(e, data) {
        debug(pluginName + ": Loading suggestions.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.LOADING_SUGGESTIONS, data.segment));
    };

    var suggestionsLoaded = function(e, data) {
        debug(pluginName + ": Suggestions loaded.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SUGGESTIONS_LOADED, data.segment,
            data.matches));
    };

    var suggestionChosen = function(e, data) {
        debug(pluginName + ": Suggestion chosen.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SUGGESTION_CHOSEN, data.segment,
            data.which, data.translation));

            textChanged({
                target: $(data.element, ".editarea")[0]
            });

        // update field content to the new value (for textChanged to work properly)
//        var inputField = $(data.element, ".editarea")[0];
//        if (getFieldContents(inputField) == "") {
//            if ($(inputField).prop("contenteditable") == "true") {
//                setFieldContents(inputField, $(inputField).text());
//            }
//            else {
//                setFieldContents(inputField, $(inputField).val());
//            }
//        }
    };

    var deletingSuggestion = function(e, data) {
        debug(pluginName + ": Deleting suggestion: '" + data.which + "'.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.DELETING_SUGGESTION, data.segment, data.which));
    };

    var suggestionDeleted = function(e, data) {
        debug(pluginName + ": Suggestion deleted.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SUGGESTION_DELETED, data.segment));
    };

    var statsUpdated = function(e, data) {
        debug(pluginName + ": Statistics updated.");

        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.STATS_UPDATED, data.segment,
            data.stats));
    };

    // store translationChanged event
    var translationChanged = function(e, data) {
        var t;
        switch (data.type) {
            case "decode":
                t = logEventFactory.DECODE;
                storeLogEvent(logEventFactory.newLogEvent(t, data.element, data.data));

                textChanged({
                    target: data.element
                });
                break;
            case "alignments":
                t = logEventFactory.ALIGNMENTS;

                storeLogEvent(logEventFactory.newLogEvent(t, data.element, data.data));
                break;
            case "suffixchange":
                t = logEventFactory.SUFFIX_CHANGE;
                storeLogEvent(logEventFactory.newLogEvent(t, data.element, data.data));

                textChanged({
                    target: data.element
                });
                break;
            case "confidences":
                t = logEventFactory.CONFIDENCES;
                storeLogEvent(logEventFactory.newLogEvent(t, data.element, data.data));
                break;
            case "tokens":
                t = logEventFactory.TOKENS;
                storeLogEvent(logEventFactory.newLogEvent(t, data.element, data.data));
                break;
        }

//        debug(pluginName + ": ITP event: '" + t + "'.");
    };

    var alignmentShownByMouse = function(e, data) {
//        debug(pluginName + ": Alignment shown by mouse.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SHOW_ALIGNMENT_BY_MOUSE, data.target));
    };

    var alignmentHiddenByMouse = function(e, data) {
//        debug(pluginName + ": Alignment hidden by mouse.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.HIDE_ALIGNMENT_BY_MOUSE, data));
    };

    var alignmentShownByKey = function(e, data) {
//        debug(pluginName + ": Alignment shown by key.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SHOW_ALIGNMENT_BY_KEY, data.element, data.data));
    };

    var alignmentHiddenByKey = function(e, data) {
//        debug(pluginName + ": Alignment hidden by key.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.HIDE_ALIGNMENT_BY_KEY, data.element, data.data));
    };

    var visMenuDisplayed = function(e, data) {
        debug(pluginName + ": Visualization menu displayed.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.VIS_MENU_DISPLAYED, data.segment));
    };

    var visMenuHidden = function(e, data) {
        debug(pluginName + ": Visualization menu hidden.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.VIS_MENU_HIDDEN, data.segment));
    };

    var configChanged = function(e, data) {
        // TODO ignore events when nothing changed? (especially when initializing...)
        debug(pluginName + ": Configuration changed: '" + JSON.stringify(data.config) + "'.");
        storeLogEvent(logEventFactory.newLogEvent(logEventFactory.CONFIG_CHANGED, data.segment, data.config));
    };

    var mouseWheelCommon = function(e, data) {
        debug(pluginName + ": Mouse wheel event: type: '" + e.type + "'.");

        switch (e.type) {
            case logEventFactory.MOUSE_WHEEL_UP:
                if (getFieldContents($(".editarea", data.segment)[0]) != $(".editarea", data.segment).text()) {
                    debug(pluginName + ": Mouse wheel up event: Changes detected.");
                    storeLogEvent(logEventFactory.newLogEvent(logEventFactory.MOUSE_WHEEL_UP, data.segment));
                    textChanged({
                        target: $(".editarea", data.segment)[0]
                    });
                }
                else {    // TODO that is unsatisfying: one doesn't know if the user tried to use the option...
                    debug(pluginName + ": Mouse wheel up event: No changes detected.");
                }
                break;
            case logEventFactory.MOUSE_WHEEL_DOWN:
                if (getFieldContents($(".editarea", data.segment)[0]) != $(".editarea", data.segment).text()) {
                    storeLogEvent(logEventFactory.newLogEvent(logEventFactory.MOUSE_WHEEL_DOWN, data.segment));
                    textChanged({
                        target: $(".editarea", data.segment)[0]
                    });
                }
                else {    // TODO that is unsatisfying: one doesn't know if the user tried to use the option...
                    debug(pluginName + ": Mouse wheel down event: No changes detected.");
                }
                break;
            case logEventFactory.MOUSE_WHEEL_INVALIDATE:    // TODO seems not really needed
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.MOUSE_WHEEL_INVALIDATE, data.segment));
                break;
        }
    };

    var mementoCommon = function(e, data) {
        debug(pluginName + ": Memento event: type: '" + e.type + "'.");

        switch (e.type) {
            case logEventFactory.MEMENTO_UNDO:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.MEMENTO_UNDO, data.segment));
                break;
            case logEventFactory.MEMENTO_REDO:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.MEMENTO_REDO, data.segment));
                break;
            case logEventFactory.MEMENTO_INVALIDATE:    // TODO seems not really needed
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.MEMENTO_INVALIDATE, data.segment));
                break;
        }
    };

    var srCommon = function(e, data) {
        debug(pluginName + ": SR event: type: '" + e.type + "'.");

        switch (e.type) {
            case logEventFactory.SR_MENU_DISPLAYED:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_MENU_DISPLAYED, data.segment));
                break;
            case logEventFactory.SR_MENU_HIDDEN:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_MENU_HIDDEN, data.segment));
                break;
            case logEventFactory.SR_MATCH_CASE_ON:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_MATCH_CASE_ON, data.segment));
                break;
            case logEventFactory.SR_MATCH_CASE_OFF:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_MATCH_CASE_OFF, data.segment));
                break;
            case logEventFactory.SR_REG_EXP_ON:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_REG_EXP_ON, data.segment));
                break;
            case logEventFactory.SR_REG_EXP_OFF:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_REG_EXP_OFF, data.segment));
                break;

            case logEventFactory.SR_RULES_SETTING:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_RULES_SETTING, data.segment));
                break;
            case logEventFactory.SR_RULES_SET:
                debug(pluginName + ": SR rules set to:");
                debug(data.rules);
//                if (data.rules === null) {
//                    data.rules = "";
//                }
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_RULES_SET, data.segment, data.rules));
                break;
            case logEventFactory.SR_RULES_APPLIED:
                if (getFieldContents($(".editarea", data.segment)[0]) != $(".editarea", data.segment).text()) {
                    storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_RULES_APPLIED, data.segment));
                    textChanged({
                         target: $(".editarea", data.segment)[0]
                    });
                }
                else {    // TODO that is unsatisfying: one doesn't know if the user tried to use the option...
                    debug(pluginName + ": SR rules applied event: No changes detected.");
                }
                break;
            case logEventFactory.SR_RULE_DELETED:
                storeLogEvent(logEventFactory.newLogEvent(logEventFactory.SR_RULE_DELETED, data.segment));
                break;
        }
    };

    var state = function(s) {
        debug(pluginName + ": Eye tracker state changed to: '" + s + "'.");

        // TODO error handling
    };

    var gaze = function(trackerTime, lx, ly, rx, ry, leftDilation, rightDilation) {
//        debug(pluginName + ": Gaze received.");

        if (w.positionValid) {

            // make left eye coordinates relative to window
            var lrx = Math.floor(lx - w.x);
            var lry = Math.floor(ly - w.y);
//            debug(pluginName + ": Coordinates: lx: '" + lx + "', ly: '" + ly + "', lrx: '" + lrx + "', lry: '" + lry + "'.");

            // make right eye coordinates relative to window
            var rrx = Math.floor(rx - w.x);
            var rry = Math.floor(ry - w.y);
//            debug(pluginName + ": Coordinates: rx: '" + rx + "', ry: '" + ry + "', rrx: '" + rrx + "', rry: '" + rry + "'.");

            if (settings.etDiscardInvalid) {
                if ( (lx < w.x || ly < w.y || lrx > w.width || lry > w.height) && (rx < w.x || ry < w.y || rrx > w.width || rry > w.height) ) {
                    debug(pluginName + ": Both eye's coordinates are outside of tracked area, gaze discarded!");
                    return;
                }
            }

            // put it all together
//            var lElement = document.elementFromPoint(lrx, lry);
//            var rElement = document.elementFromPoint(rrx, rry);
//            var element = window;
//            if (lElement === null && rElement !== null) {
//                element = rElement;
//            }
//            else if (lElement !== null && rElement === null) {
//                element = lElement;
//            }
//            else if (lElement !== null && rElement !== null) {
//                if (lElement !== rElement) {    // TODO store 2 different elementId/xPath for this?
//                    element = lElement;
//                }
//                else {
//                    element = lElement;
//                }
//            }
            var lCharInfo = $.fn.characterFromPoint(lrx, lry);
            var rCharInfo = $.fn.characterFromPoint(rrx, rry);

//            debug(pluginName + ": element: '" + element + "'");
//            debug(pluginName + ": left char offset: '" + lCharInfo.offset + "', left char: '" + lCharInfo.character + "'.");
//            debug(pluginName + ": right char offset: '" + rCharInfo.offset + "', right char: '" + rCharInfo.character + "'.");

            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.GAZE, rCharInfo.element, trackerTime, lrx, lry, rrx, rry,
                leftDilation, rightDilation, lCharInfo.character, lCharInfo.offset, rCharInfo.character, rCharInfo.offset));
        }
        else {
            debug(pluginName + ": 'window' position is not valid, gaze discarded!");
        }
    };

    var fixation = function(trackerTime, x, y, duration) {
//        debug(pluginName + ": Fixation received.");

        if (w.positionValid) {
            // make coordinates relative to window
            var rx = Math.floor(x - w.x);
            var ry = Math.floor(y - w.y);
//            debug(pluginName + ": Coordinates: x: '" + x + "', y: '" + y + "', rx: '" + rx + "', ry: '" + ry + "'.");

            if (settings.etDiscardInvalid) {
                if (x < w.x || y < w.y || rx > w.width || ry > w.height) {
                    debug(pluginName + ": Coordinates are outside of tracked area, fixation discarded!");
                    return;
                }
            }

//            var element = document.elementFromPoint(rx, ry);
//            if (element === null) {
////                debug(pluginName + ": 'element' is null, adjusting to 'window'...");
//                element = window;
//            }
            var charInfo = $.fn.characterFromPoint(rx, ry);

//            debug(pluginName + ": char offset: '" + charInfo.offset + "', char: '" + charInfo.character + "'.");
            storeLogEvent(logEventFactory.newLogEvent(logEventFactory.FIXATION, charInfo.element, trackerTime, rx, ry, duration,
                charInfo.character, charInfo.offset));
        }
        else {
            debug(pluginName + ": 'window' position is not valid, fixation discarded!");
        }
    };

    // Just to now that everything has been parsed...
    debug(pluginName + ": Plugin codebase loaded.");

})( jQuery, window, document );
