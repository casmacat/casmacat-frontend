(function(module, global){

  var CatClient = require("catclient");
  var HtrClient = CatClient;

  $.extend(HtrClient.prototype, {

    /** 
    * Start HTR session.
    * @param {Object}
    * @setup obj
    *   source {String}
    *   target {String}
    *   caretPos {Number}
    * @trigger startSessionResult
    * @return {Object} 
    *   errors {Array} List of error messages
    *   data {Object}
    *   @setup data
    *     elapsedTime {Number} ms
    */
    startSession: function(obj) {
      this.checkConnection();
      this.server.emit('startSession', {data: obj});
    },

    /** 
    * Send data points sequence.
    * @param {Object}
    * @setup obj
    *   points {Array} 3D tuple: (x, y, timestamp)
    * @trigger [addStrokeResult]
    * @return {Object} 
    *   errors {Array} List of error messages
    *   data {Object}
    *   @setup data
    *     elapsedTime {Number} ms
    *     nbest {Array} List of objects
    *     @setup nbest
    *       text {Array} Partially recognized text
    *       textSegmentation {Array} Segmentation of partially recognized text
    *       [elapsedTime] {Number} ms
    */   
    addStroke: function(obj) {
      this.checkConnection();
      this.server.emit('addStroke', {data: obj});
    },
    
    /** 
    * Close HTR session, i.e., retrieves recognized text.
    * @trigger endSessionResult
    * @return {Object} 
    *   errors {Array} List of error messages
    *   data {Object}
    *   @setup data
    *     elapsedTime {Number} ms
    *     nbest {Array} List of objects
    *     @setup nbest
    *       text {Array} Recognized text
    *       textSegmentation {Array} Segmentation of recognized text
    *       [elapsedTime] {Number} ms
    */
    endSession: function() {
      this.checkConnection();
      this.server.emit('endSession');
    },    
     
  });

  // Expose
  module.exports = HtrClient;

})('object' === typeof module ? module: {}, this);
