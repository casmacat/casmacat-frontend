$(function() {

  $.fn.showProgressIndicator();

  $(window).on("articleloaded", function () {
    var article = $('div#outer article');
//debug("Article loaded");
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

      // this is now done in replay on 'openSegment':
      // disable editables so they don't get the focus anymore
      /*var logRootElement = "div#outer article";
      $(logRootElement).find("input:text").each(function(index, value) {
          $(this).prop("disabled", "disabled");
      });
      $(logRootElement).find("textarea").each(function(index, value) {
          $(this).prop("disabled", "disabled");
      });
      $(logRootElement).find(".editarea").each(function(index, value) {
          $(this).prop("contenteditable", "false");
      });
      debug("virtualScreen: 'vsEditorReady'");
      window.parent.$(window.parent).trigger("vsEditorReady", null);*/

       $.fn.hideProgressIndicator();
    }
  });
});


