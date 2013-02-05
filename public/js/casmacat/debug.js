// just for a debug log function

"use strict";

/* const */ var USE_CONSOLE_LOG = true;
/* const */ var USE_WINDOW_DUMP = true;

var debug = function(msg) {

    if (USE_WINDOW_DUMP && window.dump) {
        window.dump('Debug: ' + JSON.stringify(msg) + '\n\n');
    }
    if (USE_CONSOLE_LOG && window.console) {
        console.log(msg);
    }
};
