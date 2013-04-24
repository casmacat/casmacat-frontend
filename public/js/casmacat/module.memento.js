// Dependencies: jquery.hotkeys
require("jquery.hotkeys");

(function(module, global){

  function Memento(elem, options) {
    
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
        
    function onRedo(e) {
      if (!stack.length) return;
      pos++;
      if (pos > stack.length - 1) {
        pos = stack.length - 1;
        return;
      }
      self.change(stack[pos]);
    };
    
    function onUndo(e) {
      if (!stack.length) return;
      pos--;
      if (pos < 0) {
        pos = 0;
        return;
      }            
      self.change(stack[pos]);
    };

    var self = this;
    
    // Public API --------------------------------------------------------------
    self.id = "Memento";
    self.version = "0.2";
    
    self.addElement = function(elem) {
      stack.length = pos + 1;
      saveState(elem);
    };

    self.invalidate = function() {
      resetState();
    };

    self.getState = function() {
      return stack[pos];
    };
    
    // Mandatory intialization method ------------------------------------------
    self.init = function(elem, options) {
      $(elem).bind('keydown', 'ctrl+z', function(e){
        onUndo(e);
      }).bind('keydown', 'ctrl+y', function(e){
        onRedo(e);
      }).bind('keydown', 'ctrl+shift+z', function(e){
        onRedo(e);
      });
      // Attach other listeners, if any
      for (var opt in options) {
        if (options.hasOwnProperty(opt) && typeof options[opt] !== 'undefined') {
          self[opt] = options[opt];
        }
      }
      console.log("Loaded", self);
      // First run, if any
      self.start();
    };
    
    // Listeners ---------------------------------------------------------------
    self.start = function() {
    };
    
    self.change = function(data) {
      return data;
    };
        
  };
  
  // Expose module
  module.exports = Memento;
  
})('object' === typeof module ? module : {}, this);
