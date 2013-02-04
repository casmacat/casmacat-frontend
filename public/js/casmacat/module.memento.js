// Dependencies: jquery.hotkeys

(function(module, global){

  function Memento(elem, options) {
    
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
    self.id = "Memento";
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
      // Wrap original so that we don't lose track of inner states
      var wrapper = $(elem).wrap('<div class="_'+self.id+'"/>');
      wrapper.bind('change', function(e){
        if ($(this).data('memento')) {
        }
      }).bind('keydown', 'Ctrl+z', function(e){
        self.undo(e);
      }).bind('keydown', 'Ctrl+y', function(e){ 
        self.redo(e);
      });
      console.log("Loaded", self);
    };
    
    // Listeners ---------------------------------------------------------------
    self.undo = function(data) {
      return data;
    };

    self.redo = function(data) {
      return data;
    };
        
  };
  
  // Expose module
  module.exports = Memento;
  
})('object' === typeof module ? module : {}, this);
