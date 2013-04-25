// Dependencies: jquery.mousewheel, jquery.hotkeys
require("jquery.mousewheel");
require("jquery.hotkeys");

(function(module, global){

  function MouseWheel(elem, options) {
    
    // Private -----------------------------------------------------------------
    var stack = [], pos = -1;
    
    function saveState(obj) {
      stack.push(obj);
      pos++;
    };
    
    function resetState() {
      stack = [];
      pos   = -1;
    };
        
    function onMoveUp(e) {
      pos++;
      //dump("onMoveUp");
      self.change(stack[pos]);
      if (pos > stack.length - 1) {
        pos = stack.length - 1;
      }      
    };
    
    function onMoveDown(e) {
      if (!stack.length) return;
      pos--;
      if (pos < 0) {
        pos = 0;
        return;
      }
      //dump("onMoveDown");
      self.change(stack[pos]);
    };

    function dump(fn) {
      //console.log( "["+self.id+"]", fn, "| size:", stack.length, "pos:", pos);
      //for (var i=0; i<stack.length; ++i) console.log( stack[i].nbest[0].target );
    }

    var self = this;
    
    
    // Public API --------------------------------------------------------------
    self.id = "MW";
    self.version = "0.1";
    
    self.addElement = function(elem) {
      if (!self.equal(elem, stack[pos])) {
        saveState(elem);
      }
      dump("add");
    };
    
    self.invalidate = function(keepCurrentState) {
      var last = stack[pos];
      resetState();
      if (keepCurrentState) {
        saveState(last);
      }
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
      }).bind('keydown', 'Alt+up', function(e){
        e.preventDefault(); // prevent scrolling
        onMoveUp(e);
      }).bind('keydown', 'Alt+down', function(e){ 
        e.preventDefault(); // prevent scrolling
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
    self.equal = function(data1, data2) {
      return data1 === data2;
    };
    
  };
  
  // Expose module
  module.exports = MouseWheel;
  
})('object' === typeof module ? module : {}, this);
