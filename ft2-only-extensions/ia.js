(function(module, global){

  module.exports = {
    useAlignments: true,
    useConfidences: false,
    confidenceThresholds: { doubt: 0.3, bad: 0.03 }, 
    mode: "ITP",
    prioritizer: "confidence",
    priorityLength: 1,
    allowRejectSuffix: true,
    allowSearchReplace: true
  };
  
})('object' === typeof module ? module : {}, this);
