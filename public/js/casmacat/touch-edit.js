// Defines the client-side code for the biconcordancer.

// herve - I'm not sure whether creating a whole new client class was the best
// way to go, but I figure since the biconcordancer functionality is pretty
// standalone and nothing depends on it, it made sense to keep it in its own
// separate files.

;(function(){

    UI.touchEditingClick = function(e,t) {
	e.preventDefault();
	if (t.hasClass("touch-edit-neutral")) {
		t.removeClass("touch-edit-neutral");
		t.addClass("touch-edit-good");
	}
	else if (t.hasClass("touch-edit-good")) {
		t.removeClass("touch-edit-good");
		t.addClass("touch-edit-bad");
	}
	else if (t.hasClass("touch-edit-bad")) {
		t.removeClass("touch-edit-bad");
		t.addClass("touch-edit-neutral");
	}
    }
	
    UI.initTouchEditing = function () {
        var $target = $('.editarea', UI.currentSegment);
	if ($target.hasClass("touch-edit")) { return; }
	$target.attr("contenteditable","false");
	$target.addClass("touch-edit");

	// make each token clickable
	var targetspans = $('.editable-token', $target);
	for (var i = 0; i < targetspans.length; i++) {
		$(targetspans[i]).addClass("touch-edit-neutral");
		$(targetspans[i]).click(function(e) { UI.touchEditingClick(e, $(this)) });
	}

	// button to trigger retranslation
	$retranslate = $('<li/>').html('<a href="#" class="itp-btn retranslate-btn" title="Retranslate">RETRANS</a><p>CTRL+???</p>')
	$retranslate.click (function (e) {
		e.preventDefault();
        	var $target = $('.editarea', UI.currentSegment);
		var annotation = [];
	        var targetspans = $('.editable-token', $target);
	        for (var i = 0; i < targetspans.length; i++) {
			if ($(targetspans[i]).hasClass("touch-edit-neutral")) { annotation[i] =  0; }
			if ($(targetspans[i]).hasClass("touch-edit-good"))    { annotation[i] = +1; }
			if ($(targetspans[i]).hasClass("touch-edit-bad"))     { annotation[i] = -1; }
		}
		$target.data('itp').itpServer.redecode({
			source: $target.data('itp').$source.editable('getOriginalText'),
			target: $target.editable('getText'),
			annotation: annotation

		});
	});
	$('.buttons', UI.currentSegment).prepend($retranslate);
    };

    UI.switchTouchEditing = function () {
        var $target = $('.editarea', UI.currentSegment);
	$target.removeClass("touch-edit");
	$target.attr("contenteditable","true");
	$(".retranslate-btn").remove();
	var targetspans = $('.editable-token', $target);
	for (var i = 0; i < targetspans.length; i++) {
		$(targetspans[i]).unbind("click");
		$(targetspans[i]).removeClass("touch-edit-neutral");
	}
    };

    UI.exitTouchEditing = function () {
        var $target = $('.editarea', UI.currentSegment);
	var targetspans = $('.editable-token', $target);
	for (var i = 0; i < targetspans.length; i++) {
		$(targetspans[i]).removeClass("touch-edit-good");
		$(targetspans[i]).removeClass("touch-edit-bad");
	}
    };


})();
