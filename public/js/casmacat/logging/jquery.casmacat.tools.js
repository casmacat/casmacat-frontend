"use strict"; // strict scope for the whole file

/**
 * jQuery CASMACAT tools
 * Original author: Ragnar Bonk
 *
 * Some parts of this script (mainly functions, follow the links provided in the comments of each funtion to find their
 * license, if any) are covered by the MIT license, the rest is GNU/GPL...
 *
 * Dependencies:
 *  - diff_match_patch.js ("http://code.google.com/p/google-diff-match-patch/")
 *  - sanitize.js ("https://github.com/gbirke/Sanitize.js/")
 *  - debug.js [optional] (get it from the author or write your own ;-) )
 *
 * Supported Browsers:
 *  - Firefox >= 15
 *  - Chrome >= 22.0.1229.79 m
 *  - IE >= 9 (xPath support seems to miss right now)
 *  - Opera >= 12.02
 *
 *  TODO testing with QUnit?
 */

(function($) {
    var replaceEntities = function(s) {
        // TODO add more?
//        s = s.replace(/&nbsp;/gmi, " ");
        s = s.replace(new RegExp(String.fromCharCode(160), "gmi"), " ");

//        s = s.replace(/&lt;/gmi, "<");
        s = s.replace(new RegExp(String.fromCharCode(60), "gmi"), "");

//        s = s.replace(/&gt;/gmi, ">");
        s = s.replace(new RegExp(String.fromCharCode(62), "gmi"), "");

//        s = s.replace(/&quot;/gmi, "\"");
//        s = s.replace(/&amp;/gmi, "&");

        return s;
    };

    /**
     * Sanitizes (removes) unwanted HTML markup. See also: "http://zadasnotes.blogspot.dk/2011/06/
     * jquery-tip-sanitize-input-fields.html". But maybe the jquery-clean plugin is a better choice? See:
     * "http://code.google.com/p/jquery-clean/"
     *
     * List with entities: "http://www.theukwebdesigncompany.com/articles/entity-escape-characters.php"
     */
    $.fn.sanitizeHTML = function(fullSanitize, next) {

        var $this = $(this);

        if (!fullSanitize) {
            if (!next) {
                debug("$.fn.sanitizeHTML(): Only removing entities...");
            }
            $this.children().each(function() {
                var s = this.textContent.toString();
//console.log(s.charAt(0) + "->" + s.charCodeAt(0));
//                debug("$.fn.sanitizeHTML(): nodeValue before entity replace: '" + s + ".'");
                var sNew = replaceEntities(s);
//                debug("$.fn.sanitizeHTML(): nodeValue after entity replace: '" + s + ".'");
                if (sNew !== s) {
                    this.textContent = s;
                }
                $(this).sanitizeHTML(fullSanitize, true);
            });
        }
        else {
            var sanitized = "";

            debug("$.fn.sanitizeHTML(): Performing full sanitize...");
            var treeWalker = document.createTreeWalker($this[0],
                NodeFilter.SHOW_TEXT, function (node) {
                    return NodeFilter.FILTER_ACCEPT;
                }, false);

            while (treeWalker.nextNode()) {
                var s = treeWalker.currentNode.nodeValue.toString();
    //console.log(s.charAt(0) + "->" + s.charCodeAt(0));
//                debug("$.fn.sanitizeHTML(): nodeValue before entity replace: '" + s + ".'");

                s = replaceEntities(s);

//                debug("$.fn.sanitizeHTML(): nodeValue after entity replace: '" + s + ".'");


                sanitized = sanitized + s;
            }

            $this.html(sanitized);
        }

//        debug("$.fn.sanitizeHTML(): innerHTML after sanitize: '" + $this.html() + ".'");

        return $this;
    };

    /**
     * Removes all attributes from a given element, see also: "http://stackoverflow.com/questions/1870441/
     * remove-all-attributes"
     */
    $.fn.removeAttributes = function() {
        return this.each(function() {
            var attributes = $.map(this.attributes, function(item) {
                return item.name;
            });

            var e = $(this);
            $.each(attributes, function(i, item) {
                e.removeAttr(item);
            });
        });
    };

    /**
     * Returns the element belonging to the (composed) elementId: (parent) id + (relative) xPath.
     * The 'this' pointer must point to the document containing the element.
     */
    $.fn.resolveFromElementId = function(id, xPath) {

//        debug("$.fn.resolveFromElementId(): Resolving element with: id: '" + id + "', '" + xPath + "'.");

        var element = null;
        if (id === "window") {
            element = $("window", this)[0];
        }
        else if (id === "") {   // TODO check this case if and when it may happen. that is probably in pure xPath mode only
            element = $("html", this)[0];
        }
        else {
            element = $("#" + id, this)[0];
        }
//        debug("$.fn.resolveFromElementId(): element dump after id:");
//        debug(element);

        if (xPath !== null && xPath !== "") { // if hybrid or xPath only mode

//            debug("$.fn.resolveFromElementId(): Using xPath: '" + xPath + "'.");

            // TODO document.evaluate() seems not to be available for IE. Maybe use this instead for IE:
            // "http://sourceforge.net/projects/js-xpath/"
            var xpr = this[0].evaluate(xPath, element, null, XPathResult.ANY_TYPE, null);
            element = xpr.iterateNext();
        }

//        debug("$.fn.resolveFromElementId(): element dump after all:");
//        debug(element);

        // breaking the chain ;-)
        return element;
    };

    /**
     * Returns the (composed) id of this element: (parent) id + (relative) xPath
     */
    $.fn.getElementId = function() {

        var elementId = {
            id: "",
            xPath: ""
        };

        if ($(this).get(0).id) {
            elementId.id = $(this).get(0).id;
//            debug("$.fn.getElementId(): Element has an id.");
        }
        else {
            var element = $(this).get(0);
            var xPath = "";
            var index = 0;

            if (element.nodeType === Node.TEXT_NODE) {
//                debug("$.fn.getElementId(): Element is a text node.");

                var nodeList = element.parentNode.childNodes;
                for (var i = 0; i < nodeList.length; i++) {
                    if (nodeList[i].nodeType === Node.TEXT_NODE) {
                        index++;
                        if (nodeList[i] === element.parentNode) {
                            break;
                        }
                    }
                }

                index = index >= 1 ? ("[" + index + "]") : "";
                xPath = "/text()" + index;

                element = element.parentNode;
            }

//            debug("$.fn.getElementId(): Element has no id...");
            for (; element && element.nodeType === Node.ELEMENT_NODE && !element.id; element = element.parentNode) {
//                debug("$.fn.getElementId(): Processing element: '" + element.tagName + "'...");
                index = $(element.parentNode).children(element.tagName).index(element) + 1;
                index = index > 1 ? ("[" + index + "]") : "";
                xPath = "/" + element.tagName.toLowerCase() + index + xPath;
            }

            if (!element.tagName || element.tagName.toLowerCase() === "html") {
                elementId.xPath = xPath;
//                debug("$.fn.getElementId(): No parent has an id.");
            }
            else {
                elementId.id = element.id;
                elementId.xPath = "." + xPath;
//                debug("$.fn.getElementId(): Parent has an id...");
            }
        }

//        debug("$.fn.getElementId(): elementId dump:");
//        debug(elementId);

        // breaking the chain ;-)
        return elementId;
    };

    /**
     * Gets an absolute the 'xPath' to this element. See also:
     * "http://stackoverflow.com/questions/3454526/how-to-calculate-the-xpath-position-of-an-element-using-javascript"
     */
    $.fn.getAbsoluteXPath = function() {

        var element = $(this).get(0);
        var xPath = "";
        for (; element && element.nodeType === Node.ELEMENT_NODE /*&& element != $(this).get(0)*/; element = element.parentNode) {

            var idx = $(element.parentNode).children(element.tagName).index(element) + 1;
            idx = idx > 1 ? ("[" + idx + "]") : "";
//            idx = idx > 1 ? ("[" + idx + "]") : "";   // TODO is this variant
                                                        // the 'more real xpath'
                                                        // way?
            xPath = "/" + element.tagName.toLowerCase() + idx + xPath;
        }

//        debug("$.fn.getAbsoluteXPath(): From '" + element.nodeName + "' to '" + $(this).get(0).nodeName + "' is: '"
//            + xPath + "'.");
        // breaking the chain ;-)
        return xPath;
    };

    /**
     * This one assumes that we cannot change multiple places at once, so everything between diffs has also been
     * changed. See also: "http://code.google.com/p/google-diff-match-patch/"
     */
    $.fn.getChanges = function(previousText, currentText) {

        var dmp = new diff_match_patch();

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!! TODO somewhere here maybe an error: it seems that the starting offset (pos) needs a -1 in some cases !!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// TODO there is also a problem here with strings like:
// 'aaabc' and 'aaaabc'. the newly inserted 'a' could be any arbitray 'a' of the second text. diff_match_patch of course
// returns the 4th 'a' as the difference
        var
            diff = dmp.diff_main(previousText, currentText),
            cursorPosition = 0,
            deleted = "",
            inserted = "",
            start = 0,
            end = 0;

try {
        // if first entry is an EQUAL, we use its length for cursorPosition otherwise we are not interested in equal
        // start and end
        if (diff[0][0] === 0) {
            cursorPosition = diff[0][1].length;
            start++;
        }
}
catch (e) {
    debug("$.fn.getChanges(): Fatal error!");
    debug("$.fn.getChanges(): previousText: '" + previousText + "', currentText: '" + currentText + "'.");
    debug("$.fn.getChanges(): 'diff' content dump:");
    debug(diff);
    alert("$.fn.getChanges(): Fatal error!");
    $.error("$.fn.getChanges(): Fatal error!");
}
        if (diff[diff.length - 1][0] === 0) {
            end = diff.length - 1;
        }
        else {
            end = diff.length;
        }

        if (start >= end) { // no diff found, return now
//            debug("$.fn.getChanges(): No diff found.");
            return null;
        }
        else {
            for (var i = start; i < end; i++) {
                switch (diff[i][0]) {
                    case 0:
                        deleted += diff[i][1];
                        inserted += diff[i][1];
                        break;
                    case -1:
                        deleted += diff[i][1];
                        break;
                    case 1:
                        inserted += diff[i][1];
                        break;
                    default:
                        $.error("$.fn.getChanges(): Unexpected diff entry: '" + diff[i][0] + "'");
                }
            }

            return {
                cursorPosition: cursorPosition,
                deleted: deleted,
                inserted: inserted
            };
        }

        // breaking the chain ;-)
//        return $(this);
    };

    // TODO
    $.fn.getSelection = function() {

        var range = {
            startNodeId: null,
            startNodeXPath: null,
            sCursorPosition: null,  // cursor position in start node
            endNodeId: null,
            endNodeXPath: null,
            eCursorPosition: null,  // cursor position in end node
            selectedText: null  // TODO can this be empty or null?
        };

        if ($(this).is("input:text") || $(this).is("textarea")) {
            var elementId = $(this).getElementId(); // TODO this will always be a hybrid id

            range.startNodeId = elementId.id;
            range.startNodeXPath = elementId.xPath;
            range.sCursorPosition = $(this).prop("selectionStart");

            range.endNodeId = elementId.id;
            range.endNodeXPath = elementId.xPath;
            range.eCursorPosition = $(this).prop("selectionEnd");

            range.selectedText = $(this).val().substring(range.sCursorPosition, range.eCursorPosition);
        }
        else {
        
          try {
            var selection = window.getSelection();  // TODO check cross browser compatibility of this
            var r = selection.getRangeAt(0);
          } catch(err) {
            return false;
          }

//            debug("$.fn.getSelection: Text range dump:");
//            debug(r);

            var startNodeId = $(r.startContainer).getElementId(); // this will always be a hybrid id (because of text nodes)
            range.startNodeId = startNodeId.id;
            range.startNodeXPath = startNodeId.xPath;
            range.sCursorPosition = r.startOffset;

            var endNodeId = $(r.endContainer).getElementId();  // this will always be a hybrid id (because of text nodes)
            range.endNodeId = endNodeId.id;
            range.endNodeXPath = endNodeId.xPath;
            range.eCursorPosition = r.endOffset;

            range.selectedText = r.toString();
//            range.selectedText = r.createContextualFragment();
        }

//        debug("$.fn.getSelection: Selection range: startNodeId: '" + range.startNodeId + "', startNodeXPath: '"
//            + range.startNodeXPath + "', sCursorPosition: '" + range.sCursorPosition + "', endNodeId: '"
//            + range.endNodeId + "', endNodeXPath: '" + range.endNodeXPath + "', eCursorPosition: '"
//            + range.eCursorPosition + "', selectedText: '" + range.selectedText + "'.");


        // breaking the chain ;-)
        return range;
    };

    /**
     * Get the cursor position within a content editable while only counting text nodes. See also:
     * "http://stackoverflow.com/questions/4767848/
     * get-caret-cursor-position-in-contenteditable-area-containing-html-content"
     *
     * TODO check for bugs
     */
    $.fn.getCursorPositionContenteditable = function() {
//        try { // TODO error handling
            var range = window.getSelection().getRangeAt(0);
            var node = $(this).get(0);

//            debug("$.fn.getCursorPositionContenteditable: Running on node: '" + node.tagName + "' and range: '"
//                + range.selectedText + "'...");

            var treeWalker = document.createTreeWalker(node,
                NodeFilter.SHOW_TEXT, function (node) {
                    var nodeRange = document.createRange();
                    nodeRange.selectNode(node);
                    if (nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1) {
//                        debug("$.fn.getCursorPositionContenteditable: Accepting node: '" + node.nodeName + "'...");
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    else {
//                        debug("$.fn.getCursorPositionContenteditable: Rejecting node: '" + node.nodeName + "'...");
                        return NodeFilter.FILTER_REJECT;
                    }
                }, false);

            var pos = 0;
            while (treeWalker.nextNode()) {
                pos += treeWalker.currentNode.length;
            }

            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                pos += range.startOffset;
            }

//            debug("$.fn.getCursorPositionContenteditable: Cursor position: '" + pos + "'.");

            // breaking the chain ;-)
//            return $(this);
            return pos;

//        }
//        catch (e) {
//            debug("Info: Could not get cursor position.");
//            return -1;
//        }
    };

       $.fn.getCaretPos = function() {
      var $this = $(this),
          data = $this.data('editable'),
          node = $this.get(0);

      var caretOffset = 0;
      try {
        if (typeof window.getSelection !== "undefined") {
          var range = window.getSelection().getRangeAt(0);
          var preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(node);
          preCaretRange.setEnd(range.endContainer, range.endOffset);
          caretOffset = preCaretRange.toString().length;
        } else if (typeof document.selection !== "undefined" && document.selection.type !== "Control") {
          var textRange = document.selection.createRange();
          var preCaretTextRange = document.body.createTextRange();
          preCaretTextRange.moveToElementText(node);
          preCaretTextRange.setEndPoint("EndToEnd", textRange);
          caretOffset = preCaretTextRange.text.length;
        }
      }
      catch (err) {
        return -1;
      }
      return caretOffset;
    };

    /**
     * Set the cursor position within a content editable while only counting text nodes. See also:
     * "http://stackoverflow.com/questions/2871081/jquery-setting-cursor-position-in-contenteditable-div"
     *
     * TODO check for bugs and browser compatibility
     */
    $.fn.setCursorPositionContenteditable = function(pos) {

        var node = $(this).get(0);

        debug("$.fn.setCursorPositionContenteditable: Running on node: '" + node.nodeName + "' for position: '" + pos + "'...");

        var treeWalker = document.createTreeWalker(node,
            NodeFilter.SHOW_TEXT, function (node) {
                return NodeFilter.FILTER_ACCEPT;
            }, false);

        var range = null;
        var currentNode = null;
        while (pos > 0 && (currentNode = treeWalker.nextNode())) {

//            debug("$.fn.setCursorPositionContenteditable: nodeName: '" + currentNode.nodeName + "',"
//                + " nodeValue: '" + currentNode.nodeValue + "', value length: '" + currentNode.nodeValue.length + "',"
//                + " remaining cursor position: '" + pos + "'");

            if (currentNode.nodeValue.length < pos) {  // just substract
//                debug("$.fn.setCursorPositionContenteditable: Substracting...");
                pos -= currentNode.nodeValue.length;
            }
            else /*if ($.browser.webkit)*/ {
                /*debug("$.fn.setCursorPositionContenteditable: Selecting: nodeName: '" + currentNode.nodeName + "', "
                    + "nodeValue: '" + currentNode.nodeValue + "', "
                    + "value length: '" + currentNode.nodeValue.length + "', remaining cursor position: '" + pos + "'");*/
                window.getSelection().removeAllRanges();
                range = document.createRange();
                range.selectNode(currentNode);
                range.setEnd(currentNode, pos);
                range.setStart(currentNode, pos);
                window.getSelection().addRange(range);
                pos = 0;
            }
        }

        if (pos > 0) {
            $.error("$.fn.setCursorPositionContenteditable: Inconsistency detected: 'pos' is still greater than '0'");
        }

//        $(this).focus();  // should be called in the last handler

        return $(this);
    };

    /**
     * Extends the jQuery selector to have one that selects scrollable elements. See
     * also: "http://erraticdev.blogspot.dk/2011/02/jquery-scroll-into-view-plugin-with.html"
     *
     * Note: For Firefox overflow-x/overflow-y must be explicitly set. Otherwise this selector will not be able to find
     * them automatically!
     *
     * TODO Alter this so that it also works for Firefox without explicit set of overflow-x/overflow-y!
     *
     * TODO Maybe alter this selector in a way that it returns not only elments that are actually having a scrollbar but
     * also those that may potentially get one!
     */
    var converter = {
        vertical: { x: false, y: true },
        horizontal: { x: true, y: false },
        both: { x: true, y: true },
        x: { x: true, y: false },
        y: { x: false, y: true }
    };
    var scrollValue = {
        auto: true,
        scroll: true,
        visible: false,
        hidden: false
    };
    var rootrx = /^(?:html)$/i;
    $.extend($.expr[":"], {
        scrollable: function (element, index, meta, stack) {
            var direction = converter[typeof (meta[3]) === "string" && meta[3].toLowerCase()] || converter.both;
            var styles = (document.defaultView && document.defaultView.getComputedStyle
                ? document.defaultView.getComputedStyle(element, null) : element.currentStyle);
            var overflow = {
                x: scrollValue[styles.overflowX.toLowerCase()] || false,
                y: scrollValue[styles.overflowY.toLowerCase()] || false,
                isRoot: rootrx.test(element.nodeName)
            };

            // check if completely unscrollable (exclude HTML element because it's special)
            if (!overflow.x && !overflow.y && !overflow.isRoot) {
                return false;
            }

            var size = {
                height: {
                    scroll: element.scrollHeight,
                    client: element.clientHeight
                },
                width: {
                    scroll: element.scrollWidth,
                    client: element.clientWidth
                },
                // check overflow.x/y because iPad (and possibly other tablets) don't dislay scrollbars
                scrollableX: function () {
                    return (overflow.x || overflow.isRoot) && this.width.scroll > this.width.client;
                },
                scrollableY: function () {
                    return (overflow.y || overflow.isRoot) && this.height.scroll > this.height.client;
                }
            };

//            debug("$.expr[:scrollable]: Found scrollable '" + element.tagName + "'.");
            return direction.y && size.scrollableY() || direction.x && size.scrollableX();
        }
    });

    /**
     * Shows ore hides the progress indicator (moving CASMACAT logo).
     *
     * TODO Should be made more general in the future. It could be a plugin on its own, so that the namespace is not
     * cluttered like it is currently the case...
     */
    var lastFocusedElement = null;

    $.fn.showProgressIndicator = function() {

        if ( $("#progressIndicator").length > 0 ) {
            $.error("$.fn.showProgressIndicator: Progress indicator already active");
        }
        else {
            lastFocusedElement = document.activeElement;
            $(document.body).append("<div id='progressIndicator'/>");

            $("#progressIndicator").css({
                "position": "absolute",
                "z-index": "9999999999",
                "background-color": "rgba(127, 127, 127, 0.5)",
                "top": "0px",
                "left": "0px",
                "width": $(document).width(),
                "height": $(document).height()
            });

            $("a.casLogo").addClass("progressIndicatorLogo").removeClass("casLogo");

            debug("$.fn.showProgressIndicator: Progress indicator displayed.");
        }

        return $(this);
    };

    $.fn.hideProgressIndicator = function() {

        if ( !$("#progressIndicator") ) {
            $.error("$.fn.hideProgressIndicator: Progress indicator not active");
        }
        else {
            $("#progressIndicator").remove();
            $("a.progressIndicatorLogo").addClass("casLogo").removeClass("progressIndicatorLogo");
            $(lastFocusedElement).focus();
            lastFocusedElement = null;
            debug("$.fn.hideProgressIndicator: Progress indicator removed.");
        }

        return $(this);
    };

    // see "http://www.kodyaz.com/content/HowToGetKeyCodesList.aspx" and "http://www.javascripter.net/faq/keycodes.htm"
    var keyCodeToKeyMap = {
        8: "Backspace",
        9: "Tab",
        13: "Enter",
        16: "Shift",
        17: "Ctrl",
        18: "Alt",
        19: "Pause/Break",
        20: "Caps Lock",
        27: "Escape",
        32: "Space",
        33: "Page Up",
        34: "Page Down",
        35: "End",
        36: "Home",
        37: "Left Arrow",
        38: "Up Arrow",
        39: "Right Arrow",
        40: "Down Arrow",
        44: "Print Screen",
        45: "Insert",
        46: "Delete",
        48: "0",
        49: "1",
        50: "2",
        51: "3",
        52: "4",
        53: "5",
        54: "6",
        55: "7",
        56: "8",
        57: "9",
        65: "A",
        66: "B",
        67: "C",
        68: "D",
        69: "E",
        70: "F",
        71: "G",
        72: "H",
        73: "I",
        74: "J",
        75: "K",
        76: "L",
        77: "M",
        78: "N",
        79: "O",
        80: "P",
        81: "Q",
        82: "R",
        83: "S",
        84: "T",
        85: "U",
        86: "V",
        87: "W",
        88: "X",
        89: "Y",
        90: "Z",
        91: "Left Windows Key",
        92: "Right Windows Key",
        93: "Select Key",   // key for windows context menu
        96: "Number Pad 0",
        97: "Number Pad 1",
        98: "Number Pad 2",
        99: "Number Pad 3",
        100: "Number Pad 4",
        101: "Number Pad 5",
        102: "Number Pad 6",
        103: "Number Pad 7",
        104: "Number Pad 8",
        105: "Number Pad 9",
        106: "*",
        107: "+",
        109: "-",
        110: "Decimal Point",
        111: "/",
        112: "F1",
        113: "F2",
        114: "F3",
        115: "F4",
        116: "F5",
        117: "F6",
        118: "F7",
        119: "F8",
        120: "F9",
        121: "F10",
        122: "F11",
        123: "F12",
        144: "Num Lock",
        145: "Scroll Lock",
//        186: "(Semi) Colon",
        188: "Comma",
        189: "Dash/Underline",
        190: ".",
//        191: "Forward Slash",
//        192: "",  // Grave Accent
//        219: "Open Bracket",
//        220: "Back Slash",
//        221: "Close Bracket",
        222: "Quote"
    };

    // see "http://www.javascripter.net/faq/keycodes.htm"
    $.fn.keyCodeToKey = function(keyCode) {
        var character = keyCodeToKeyMap[keyCode];
        if (!character) {
            character = "";
        }
        return character;
    };


})(jQuery);

// Just to know that additional code has been parsed...
debug("Tools codebase loaded.");
