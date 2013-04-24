$(function() {

  $.fn.showOverlay();

  $(window).on("articleloaded", function () {
    var article = $('div#outer article');
//debug("Article loaded");
    if (!config.replay) {
        if (config.debug) { // enable reset document button
            $("#resetDocument").text('Reset Document').on("click", function(e) {
                e.preventDefault();

                $(window).logging("stop", true);

                var data = {
                    action: "resetDocument",
                    fileId: config.file_id,
                    jobId: config.job_id
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
                            alert("(Server) Error resetting document: '" + result.errors[0].message + "'");
                            $.error("(Server) Error resetting document: '" + result.errors[0].message + "'");
                        }
                    },
                    error: function(request, status, error) {
                        debug(request);
                        debug(status);
                        debug(error);
                        alert("Error resetting document: '" + error + "'");
                        $.error("Error resetting document: '" + error + "'");
                    }
                });
            });

//            $("#stopLogging").on("click", function(e) {
//                e.preventDefault();
//
//                $(window).logging("stop", true);
//            });
        }

        // from: "http://stackoverflow.com/questions/1950038/jquery-fire-event-if-css-class-changed#1950052"
//        (function(){
//            // Your base, I'm in it!
//            var originalAddClassMethod = jQuery.fn.addClass;
//
//            jQuery.fn.addClass = function(){
//                // Execute the original method.
//                var result = originalAddClassMethod.apply( this, arguments );
//
//                // trigger a custom event
//                jQuery(this).trigger('cssClassChanged');
//
//                // return the original result
//                return result;
//            }
//        })();

//        $(".source").css("font-size", "20pt");
//        $(".editarea").css("font-size", "20pt");
//        $(".graysmall li").live("cssClassChanged", function(e) {
//            $(".graysmall li span").css("font-size", "20pt");
//        });

        if (config.etEnabled) {
            $('head').append("<link rel='stylesheet' href='" + config.basepath + "/public/css/et.css' type='text/css' />");
        }

        $(window).logging({
            "fileId": config.file_id,
            "jobId": config.job_id,
            "maxChunkSize": config.logMaxChunkSize,
//            "maxChunkSize": 50,
            "logRootElement": "html > body > div#outer",

            "doSanitize": true,             // TODO check this! not working with IMT currently
            "logItp": config.itpEnabled,    // when IMT enabled, set this to true, set to false otherwise
            "logEyeTracker": config.etEnabled,    // when ET enabled, set this to true, set to false otherwise
            "etDiscardInvalid": false,       // do not discard gaze samples/fixations outside of tracker area
            "etType": config.etType
        });
        $(window).logging("start");

        $.fn.hideOverlay();
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

        if (config.etEnabled) {
            $('head').append("<link rel='stylesheet' href='" + config.basepath + "/public/css/et.css' type='text/css' />");
        }

        $.fn.hideOverlay();
    }
  });
});


