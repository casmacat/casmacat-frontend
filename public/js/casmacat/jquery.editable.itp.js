(function($) {
  var namespace = 'itp';
  var nsClass   = '.' + namespace;
  var ItpEvents           = require('itp-events');
  var PredictiveCatClient = require("catclient.predictive");
  require("jquery.editable");

  var itpServerCache = {};

  /**
  * Create a PredictiveCatClient connection from the URL. Connections are cached, 
  * so if a connection  was already created, it will be reused
  * @param url {String} Server URL to connect to
  */
  function getItpServer(url) {
    var doTriggerConnect = false;
    if (!(url in itpServerCache)) {
      // Connect to a server; casmacat will receive async server responses
      var server = new PredictiveCatClient(true);
      server.connect(url);
      itpServerCache[url] = server;
    } 
    else {
      if (itpServerCache[url].isConnected()) {
        doTriggerConnect = true;
      }
      else {
        itpServerCache[url].checkConnection();
      }
    }
    return { itpServer: itpServerCache[url], doTriggerConnect: doTriggerConnect };
  }

  var methods = {
    init: function(_options) {
      // extend default options with user defined options
      var options = $.extend({
        debug: false, 
        sourceSelector: undefined, // selector for the HTML element that provides the source to translate
        sourceDisabled: true, // if true, the source cannot be edited by the user 
        itpServerUrl: undefined, 
      }, _options);


      return this.each(function() {
        var $this = $(this)
          , $source = $(options.sourceSelector)
          , itpRes = getItpServer(options.itpServerUrl)
          , itpServer = itpRes.itpServer
          , data = {
              $source: $source,
              $target: $this,
              itpServer: itpServer,
              config: {
                useAlignments: true,
                useConfidences: true,
                mode: 'ITP',
                prioritizer: 'confidence',
                priorityLength: 1,
                suggestions: false,
                confidenceThresholds: { doubt: 0.4, bad: 0.03 },
              }
            };

        $this.data(namespace, data);

        $this.options = options;

        $this.editable();
        $source.editable({disabled: options.sourceDisabled});
        
        data.events = new ItpEvents($this, namespace, nsClass);
        data.events.attachEvents();
        if (itpRes.doTriggerConnect) itpServer.trigger('connect');
      });
    },

    destroy: function() {
      return this.each(function() {
        var $this = $(this)
          , $source = $this.data(namespace).$source
          ;

        // Namespacing FTW
        $this.data(namespace).events.removeEvents();
        $this.removeData(namespace);
        $source.editable('destroy');
        $this.editable('destroy');
      })
    },

    getOptions: function() { return this.options; },
    setOptions: function(options) { this.options = options; },

    decode: function() { 
      var data = $(this).data(namespace);
      data.itpServer.decode({source: data.$source.editable('getText')});
    },

    startSession: function() { 
      var data = $(this).data(namespace);
      data.itpServer.startSession({source: data.$source.editable('getText')});
    },

    endSession: function() { 
      var data = $(this).data(namespace);
      data.itpServer.endSession();
    },

    validate: function() { 
      data.itpServer.decode({source: data.$source.editable('getText'), target: data.$target.editable('getText')});
    },
  };



  $.fn.editableItp = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || ! method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' +  method + ' does not exist on jQuery.' + namespace);
    }    
  };

})(jQuery);
