(function(module, global){

  var CatClient = require("catclient");
  var BiconcorClient = CatClient;

  $.extend(BiconcorClient.prototype, {

    biconcor: function (srcPhrase) {
      this.checkConnection();
      this.server.emit ('biconcor', {data: {
        srcLang: config.source_lang,
        tgtLang: config.target_lang,
        srcPhrase: srcPhrase
      }});
    }

  });

  module.exports = BiconcorClient;

})('object' === typeof module ? module : {}, this);
