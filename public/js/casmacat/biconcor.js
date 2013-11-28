// Defines the client-side code for the biconcordancer.

// herve - I'm not sure whether creating a whole new client class was the best
// way to go, but I figure since the biconcordancer functionality is pretty
// standalone and nothing depends on it, it made sense to keep it in its own
// separate files.

;(function(){

    var BiconcorClient = require("biconcor.client");
    var getClient = (function () {
        // Only connect to the server when the button is first clicked.
        var client;
        return function () {
            if (typeof client === 'undefined') {
                client = new BiconcorClient (
                    true // i.e. do print debug mesgs to console
                );
                client.connect (config.itpserver);
                registerHandlers (client);
            }
            return client;
        };
    })();

    // Add our button to the button bar under the text edit box
    var original_openSegment = UI.openSegment;
    UI.openSegment = function (editarea) {
        original_openSegment.call (UI, editarea);
        var $indicator = ('.buttons', UI.currentSegment).find('.biconcor-indicator');
        if ($indicator.length === 0) {
            $indicator = $('<li/>').html (
                '<a href="#"'
                        + ' class="itp-btn biconcor-btn"'
                    + ' title="Biconcordancer"'
                    + '>\u2637</a>'
            );
            $indicator.click (function (e) {
                e.preventDefault();
                UI.launchBiconcor (e);
            });
            $('.buttons', UI.currentSegment).prepend($indicator);
        }
    };

    // Button click handler
    UI.launchBiconcor = function (evt) {
        // NB document.getSelection() not available in IE
        // 
        // NB we don't even check that the selected text belongs to the current
        // segment's source. The user can select text absolutely anywhere on
        // the page, and get a concordance for it. Doesn't matter I guess.
        // 
        var selectedText = document.getSelection().toString();
        if (selectedText) {
            getClient().biconcor (selectedText);
        }  else {
            showDialog ({promptForSrcPhrase: true});
        }
    };

    // Top-level handler for biconcorResult messages received from the server
    function registerHandlers (client) {
        client.on ('biconcorResult', function (data, err) {
            if (err && err.length > 0 && err[0]) {
                alert ("The biconcordancer server is unhappy:\n\n" + err);
                return;
            }
            showDialog (data);
        });
    }

    function showDialog (data) {
        var title;
        var elQuery = buildNode ('input', {
            className: 'biconcor',
            value: data.srcPhrase || '',
            onkeypress: function (evt) {
                if ((evt || window.event).keyCode == 13)
                    getClient().biconcor (this.value);
            }
        });
        if (data.warm) {
            buildConcordanceGUI (data.concorStruct);
        } else if (data.promptForSrcPhrase) {
            buildSrcPhrasePrompt();
        } else {
            buildWarmingUpMessage ();
            title = "Just a moment...";
        }
        $(elDialog).dialog ({
            modal: true,
            width: 'auto',
            title: title
        });
        elDialog.parentNode.style.zIndex = 10000; // 1000 not enough
        if (!title) {
            elDialog.parentNode.appendChild (elQuery);
            elQuery.focus();
        }
    }


    // --- GUI definition ---

    // All these hardcoded styles should go in a separate stylesheet

    function buildSrcPhrasePrompt () {
        setChildren (elDialog, buildNode (
            'p', {},
            "Type a word in the box above to look up its concordances",
            ['br'],
            ['br'],
            "You can also select a word in the document itself before opening this dialog,",
            ['br'],
            "the word will be automatically queried."
        ));
    }

    function buildWarmingUpMessage () {
        setChildren (elDialog, buildNode (
            'p', {},
            "The concordancer went to sleep.",
            ['br'],
            "It's waking up, should take around 10 seconds..."
        ));
    }

    function buildConcordanceGUI (concorStruct) {
        setChildren (elDialog); // clear

        concorStruct.forEach (function (tgtPhraseStruct) {
            elDialog.appendChild (buildNode ('h5', {
                style: {margin: '0'}
            }, tgtPhraseStruct.tgt_phrase.replace (/ @-@ /, '-')));
            var elTable = buildNode ('table', {
                style: {
                    fontSize: 'x-small',
                    borderSpacing: '0px',
                    borderCollapse: 'collapse',
                    marginTop: '0.25em'
                }
            });
            elDialog.appendChild (elTable);
            var sentPairs = tgtPhraseStruct.sent_pairs;
            for (var j = 0; j < sentPairs.length; j++) {
                var elRow = buildNode ('tr');

                function td (title, args) {
                    if (!args)
                        args = {};
                    if (!args.style)
                        args.style = {}
                    args.style.padding = '0.2em !important';
                    args.title = title;
                    var argsAsTrueArray = Array.prototype.slice.call(arguments,1);
                    var nodeDef = ['td'].concat (argsAsTrueArray);
                    var elTd = buildNode.apply (this, nodeDef);
                    elRow.appendChild (elTd);
                    return elTd;
                }

                var padding = '';
                for (var i = 0; i < 30; i++)
                    padding += '\u00A0';
                function textCropper (fullSent, anchor, txt) {
                    function addAnchor (d) {
                        d[anchor] = '0px';
                        return d;
                    }
                    return td (
                        fullSent,
                        {style: {overflow: 'hidden'}},
                        buildNode (
                            'div', {
                                style: {
                                    position: 'relative',
                                    display: 'inline',
                                    overflow: 'hidden'
                                }
                            }, [
                                'div', {
                                    style: addAnchor ({
                                        whiteSpace: 'nowrap',
                                        position: 'absolute',
                                        top: '0px',
                                        textAlign: anchor
                                    }),
                                },
                                txt
                            ],
                            padding
                        )
                    );
                }

                for (var k = 0; k < 2; k++) {
                    var sent = sentPairs[j][k];
                    var match = sent.match (/^(.*)<concord>(.*?)<\/concord>(.*)/);
                    var fullSent = match[1] + match[2] + match[3];
                    if (match) {
                        textCropper (fullSent, 'right', match[1]);
                        td (fullSent, {style: {
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}, match[2]);
                        textCropper (fullSent, 'left', match[3]);
                    } else {
                        elRow = null;
                        break;
                    }
                    if (k == 0)
                        td (fullSent, {}, padding.substring(0,5))
                }

                if (elRow)
                    elTable.appendChild (elRow);
            }
        });
    }

    var elDialog;
    $(function () {
        elDialog = buildNode (
            'div', {
                style: {
                    display: 'none',
                    maxHeight: '20em',
                    overflow: 'auto'
                },
            }
        );
    });


    // --- rest is generic utils ---

    function setChildren (node) {
        while (node.hasChildNodes())
            node.removeChild (node.firstChild);
        for (var i = 1; i < arguments.length; i++)
            node.appendChild (arguments[i]);
    }

    function buildNode (tag, attr) {
        var node = document.createElement (tag);

        if (attr) {
            function applyAttr (coll, tgt) {
                for (var key in coll) {
                    var val = coll[key];
                    if (val.constructor === String || val.constructor === Function) {
                        tgt[key] = val;
                    } else {
                        if (!(key in tgt))
                            tgt[key] = {}
                        applyAttr (val, tgt[key]);
                    }
                }
            }
            applyAttr (attr, node);
        }
            
        for (var i = 2; i < arguments.length; i++) {
            var child = arguments[i];
            if (child.nodeType) {
                // already a DOM node -- do nothing
            } else if (child.constructor === String) {
                child = document.createTextNode (child);
            } else if (child.constructor === Array) {
                child = buildNode.apply (this, child);
            } else {
                child = null;
            }

            if (child)
                node.appendChild (child);
        }

        return node;
    }

})();