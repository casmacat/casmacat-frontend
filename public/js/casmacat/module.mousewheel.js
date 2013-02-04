// Dependencies: jquery.mousewheel, jquery.hotkeys
require("jquery.mousewheel");
require("jquery.hotkeys");

(function(module, global){

  function MouseWheel(elem, options) {
    
    // Private -----------------------------------------------------------------
    var stack = [], pos = 0;
    
    function saveState(obj) {
      stack.push(obj);
      //pos = stack.length - 1;
    };
    
    function resetState() {
      stack = [];
      pos   = 0;
    };
        
    function onMoveUp(e) {
      pos++;
      if (pos > stack.length) {
        pos = stack.length;
      }
      dump("up");
      if (pos >= 0 && stack.length > 0) {
        self.change(stack[pos]);
      }
    };
    
    function onMoveDown(e) {
      pos--;
      if (pos < 0) {
        pos = 0;
      }
      dump("down");
      if (pos >= 0 && stack.length > 0) {
        self.change(stack[pos]);
      }
    };

    function dump(fn) {
      //console.log( "["+self.id+"]", fn, "| size:", stack.length, "pos:", pos );
    }

    var self = this;
    
    
    // Public API --------------------------------------------------------------
    self.id = "MW";
    self.version = "0.1";
    
    self.addElement = function(elem) {
      saveState(elem);
      dump("add");
    };
    
    self.invalidate = function() {
      resetState();
      dump("invalidate");
    };
    
    // Mandatory intialization method ------------------------------------------
    self.init = function(elem, options) {
      // Mandatory(?) listeners: mouse + keyboard
      $(elem).mousewheel(function(e,delta){
        if (delta > 0) {
          onMoveUp(e);
        } else if (delta < 0) { 
          onMoveDown(e);
        }
        // block scroll over element
        return false;
      }).bind('keydown', 'Ctrl+up', function(e){
        onMoveUp(e);
      }).bind('keydown', 'Ctrl+down', function(e){ 
        onMoveDown(e);
      });
      // Attach other listeners, if any
      for (var opt in options) {
        if (options.hasOwnProperty(opt) && typeof options[opt] !== 'undefined') {
          self[opt] = options[opt];
        }
      }
      console.log("Loaded", self);
    };
    
    // Listeners ---------------------------------------------------------------
    self.change = function(data) {
      return data;
    };
    
  };
  
  // Expose module
  module.exports = MouseWheel;
  
})('object' === typeof module ? module : {}, this);
