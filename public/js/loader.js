/*
	Project:		Matecat, 2012
	Component:		Loader
*/

Loader = {

	components: new Array (
		'cat',
     'casmacat/itp'
	),

	forkComponents: new Array (
		'cat2'
	),
// cat-fork

	libraries: new Array (
  	'../casmacat/require.node',
		'jquery',
		'jquery-ui-1.8.20.custom.min',
		'jquery.tabify',
		'jquery.hotkeys',
//		'jquery.atooltip',
        'jquery-fieldselection.min',
        'diff_match_patch',
        'waypoints'
	),

	include: function(f,p,b) {
		document.write('<script type="text/javascript" src="' + b + p + f + '?build=' + config.build_number + '"></script>');
    },

	includeStyle: function(f,p,b) {
		document.write('<link rel="stylesheet" type="text/css" href="' + b + p + f + '?build=' + config.build_number + '" media="screen" />');
    },

	detect: function(a) {
		if (window.location.href.indexOf('?') == -1) return;
		var vars = window.location.href.split('?')[1].split('&');
		var vals = new Array();
		for (var i=0; i<vars.length; i++) {
			vals[i] = {name:vars[i].split('=')[0],value:vars[i].split('=')[1]};
		}
		for (var j=0; j<vals.length; j++) {
			if (vals[j].name==a) {return vals[j].value;}

		}
		return;
	},

	start: function() {
		var l = this.libraries;
		var c = this.detect('fork')? this.forkComponents : this.components;
		this.basePath = config.basepath+'public/js/';
		for (var i = 0; i < l.length; i++) this.include(l[i] + '.js', 'lib/', this.basePath);
		for (var i = 0; i < c.length; i++) this.include(c[i] + '.js', '', this.basePath);

    // CASMACAT extension start
    if (config.enable_logging) {
      if(this.detect('replay') != "true") {
                      this.include('debug.js', 'casmacat/logging/', this.basePath);
                      this.include('diff_match_patch.js', 'casmacat/logging/', this.basePath);
                      this.include('sanitize.js', 'casmacat/logging/', this.basePath);
                      this.include('jquery.casmacat.tools.js', 'casmacat/logging/', this.basePath);
                      this.include('casmacat.logevent.js', 'casmacat/logging/', this.basePath);
                      this.include('jquery.casmacat.logging.js', 'casmacat/logging/', this.basePath);
                      this.include('logging.hooks.js', 'casmacat/logging/', this.basePath);
                      this.include('index.js', 'casmacat/logging/', this.basePath);
      }
      else if(this.detect('replay') == "true") {
                      this.include('debug.js', 'casmacat/logging/', this.basePath);
                      this.include('jquery.casmacat.tools.js', 'casmacat/logging/', this.basePath);
                      this.include('logging.hooks.js', 'casmacat/logging/', this.basePath);
                      this.include('index.js', 'casmacat/logging/', this.basePath);
      }
    }
                // CASMACAT extension end
  }
}

Loader.start();
