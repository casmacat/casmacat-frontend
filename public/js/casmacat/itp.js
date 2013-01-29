$(function(){

  function insertScript(url, nodeName) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    var parentNode = document.getElementsByTagName(nodeName || 'head')[0];
    parentNode.appendChild(script);
    console.log("insertScript:", url);
  };
  
  function insertStyle(url) {
    var css = document.createElement('link');
    css.type = 'text/css';
    css.rel = "stylesheet";
    css.href = url;
    var parentNode = document.getElementsByTagName('head')[0];
    parentNode.appendChild(css);
    console.log("insertStyle:", url);
  };
  
  //insertStyle(config.basepath  + 'public/css/casmacat/itp.css');
  //insertScript(config.basepath + 'public/js/casmacat/socket.io.js');
  //insertScript(config.basepath + 'public/js/casmacat/predictivecat.js');
  //insertScript(config.basepath + 'public/js/casmacat/itp-wrapper.js');

});
