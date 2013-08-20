$(function() {
    // change the logo, very important ;-)
    /*$("html > head > link[href='/public/img/favicon.ico']").attr("href", "/public/img/casFavicon.ico");
    $("a.logo").addClass("casLogo").removeClass("logo");*/
    // adjust article layout
    $("html > body > article").attr("style" , "border: none; background: none; -moz-box-shadow: none;"
        + " -webkit-box-shadow: none; margin-left: 0px; margin-right: 0px; width: 100%;");

    $.fn.showOverlay();

    $("#virtualScreen").load(function(e) {  // TODO why is it also triggered after the initial load completed?
//                    vsWindow = $("#virtualScreen")[0].contentWindow;
//                    debug(vsWindow);

//                    var storedSpeed = $.cookie("speed");
//                    if (storedSpeed != null) {
//
//                        $("#selectSpeed").val(storedSpeed);
//                        $(window).replaying("setSpeed");
//                    }
//                    $.cookie("speed", "1.0", { path: "/replay", expires: "30" });

        $(window).replaying("setVsReady");
    });

    $("#start").click(function(e) {
        $(window).replaying("start");
    });

    $("#pauseResume").click(function(e) {
        $(window).replaying("pauseResume");
    });

    $("#reset").click(function(e) {
        $(window).replaying("reset");
    });

    $("#previousEvent").click(function(e) {
        $(window).replaying("previousEvent");
    });

    $("#nextEvent").click(function(e) {
        $(window).replaying("nextEvent");
    });

    $("#toggleInput").click(function(e) {
        $(window).replaying("toggleInput");
    });

    var oldSpeed = "1.00";
    $("#selectSpeed").click(function(e) {
        oldSpeed = $(this).val();
        $(this)[0].selectionStart = 0;
        $(this)[0].selectionEnd = $(this).val().length;
    });

    $("#selectSpeed").blur(function(e) {
        $(window).replaying("setSpeed");
    });

    $("#startTime").mouseover(function(e) {
        var s = new Date(parseInt(config.startTime));
        $("#startTime").val(s.toLocaleString());
        var e = new Date(parseInt(config.endTime));
        $("#endTime").val(e.toLocaleString());
    });

    $("#startTime").mouseout(function(e) {
        $("#startTime").val(config.startTime);
        $("#endTime").val(config.endTime);
    });

    $("#endTime").mouseover(function(e) {
        var s = new Date(parseInt(config.startTime));
        $("#startTime").val(s.toLocaleString());
        var e = new Date(parseInt(config.endTime));
        $("#endTime").val(e.toLocaleString());
    });

    $("#endTime").mouseout(function(e) {
        $("#startTime").val(config.startTime);
        $("#endTime").val(config.endTime);
    });

    // TODO timeSlider calls change() over and over, fix it
    $("#timeSlider").change(function(e) {
//                    $(window).replaying("setTime");
        $("#currentTime").val($(this).val());
        checkTime($("#currentTime")[0]);
    });

    $("#currentTime").blur(function(e) {
        checkTime(this);
    });

    $("#currentTime").keypress(function(e) {
        if (e.which == 13) {    // ENTER pressed
            checkTime(this);
        }
    });

    var checkTime = function(element) {
        if ( $("#startTime").val() <= $(element).val() && $(element).val() <= $("#endTime").val() ) {
            $("#timeSlider").val($("#currentTime").val());
//                            $("#timeSlider").change();
            $(window).replaying("setTime");
        }
        else {
            $(element).val($("#timeSlider").val());
        }
    };

    // for debugging
    $("#vsConfig").click(function(e) {
        var vsWindow = $("#virtualScreen")[0].contentWindow;
        var configStr = JSON.stringify(vsWindow.config);
//        var formatted = $(configStr).format({method: "json"});
//        alert("Config:\n " + formatted);
        alert("Config:\n " + configStr);
    });
    $("#vsDimensions").click(function(e) {
        var vsWindow = $("#virtualScreen")[0].contentWindow;
        alert("Dimensions:\n " + vsWindow.$(vsWindow).width() + " x " + vsWindow.$(vsWindow).height());
    });
    $("#vsWidth").blur(function(e) {
        $(window).replaying("setVSWidth");
    });
    $("#vsHeight").blur(function(e) {
        $(window).replaying("setVSHeight");
    });
    $("#etXOffset").blur(function(e) {
        $(window).replaying("setETOffsets");
    });
    $("#etYOffset").blur(function(e) {
        $(window).replaying("setETOffsets");
    });


    $(window).replaying({
        "fileId": config.fileId,
        "jobId": config.jobId,
        "maxChunkSize": 500,
        "isLive": true, // experimental
        "itpEnabled": config.itpEnabled,
        "showDimensions": true,
        "etRemapAOI": false,
        "ignoreSelectionErrors": true,
        "abortOnTextErrors": true,
        "etCollect": false
    });

//                $(window).on("vsEditorReady", function(e) {
//                    $(window).replaying("setVsEditorReady");
//                });

    $.fn.hideOverlay();
});