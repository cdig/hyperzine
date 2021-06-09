Take [], ()->
  return if window?.isDB # DB has its own Printer

  { performance } = require "perf_hooks" unless performance?

  Make "Printer", Printer = (msg, attrs, time)->
    time = (time or performance.now()).toFixed(0).padStart(5)
    console.log time + "  " + msg
