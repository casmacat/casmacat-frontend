$(function() {

  $.fn.showProgressIndicator();

  $(window).on("articleloaded", function () {
    var article = $('div#outer article');
//debug("Article loaded");
    if (!config.replay) {
        if (config.debug) { // enable reset document button
            $("#resetDocument").on("click", function(e) {
                e.preventDefault();

                $(window).logging("stop");

                var data = {
                    action: "resetDocument",
                    fileId: config.file_id,
                    jobId: config.job_id,
                };

                $.ajax({
                    async: false,
                    url: config.basepath + "?action=resetDocument",
                    data: data,
                    type: "GET",
                    dataType: "json",
                    cache: false,
                    success: function(result) {
                        if (result.data && result.data == "OK") {
                            alert("Document reset, will now reload...");
//                            $(window).logging("start");
                            var url = window.location.toString().substr(0, window.location.toString().lastIndexOf("#"));
                            window.location = url;
                        }
                        else if (result.errors) {    // TODO is the error format really like this? with the index access
                                                    // 'result.errors[0]'?
                            alert("(Server) Error uploading 'logList': '" + result.errors[0].message + "'");
                            $.error("(Server) Error uploading 'logList': '" + result.errors[0].message + "'");
                        }
                    },
                    error: function(request, status, error) {
                        debug(request);
                        debug(status);
                        debug(error);
                        alert("Error uploading 'logList': '" + error + "'");
                        $.error("Error uploading 'logList': '" + error + "'");
                    }
                });
            });
        }

        $(window).logging({
            "fileId": config.file_id,
            "jobId": config.job_id,

            "doSanitize": true,    // when IMT enabled, set this to false, set to true otherwise
            "logItp": false,    // when IMT enabled, set this to false, set to true otherwise
            "logRootElement": "html > body > div#outer",
            "maxChunkSize": 10
        });
        $(window).logging("start");

        $.fn.hideProgressIndicator();
    }
    else {
//      debug("virtualScreen: Setting editables read-only...");

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


