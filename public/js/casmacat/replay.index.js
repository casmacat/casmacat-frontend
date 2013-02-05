$(function() {
  console.log("replay index", window.location);
  $.fn.showProgressIndicator();

  $(window).on("articleloaded", function () {
    var article = $('div#outer article');
    console.log("Article loaded");
    if (!config.replay) {
      $(window).logging({
          "fileId": config.file_id,
          "jobId": config.job_id,

          "doSanitize": false,
          "logRootElement": "html > body > div#outer",
          "maxChunkSize": 10
      });
      $(window).logging("start");

      $.fn.hideProgressIndicator();
    }
    else {
      debug("virtualScreen: Setting editables read-only...");
      // disable editables so they don't get the focus anymore
      var logRootElement = "html > body > div#outer > article";
      $(logRootElement).find("input:text").each(function(index, value) {
          $(this).prop("disabled", "disabled");
      });
      $(logRootElement).find("textarea").each(function(index, value) {
          $(this).prop("disabled", "disabled");
      });
      $(logRootElement).find("*[contenteditable=true]").each(function(index, value) {
          $(this).prop("contenteditable", "false");
      });
      debug("virtualScreen: 'vsEditorReady'");
      window.parent.$(window.parent).trigger("vsEditorReady", null);

       $.fn.hideProgressIndicator();
    }
  });
});


