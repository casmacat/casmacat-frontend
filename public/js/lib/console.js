// This prevents stop executing JS code when the console is not available
if (typeof window.console === "undefined") {
  window.console = {};
  console.log = console.info = console.error = console.warn = console.debug = function(){};
}
