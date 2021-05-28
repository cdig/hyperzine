{ performance } = require "perf_hooks"

Take [], ()->

  Make "Printer", Printer = (msg, attrs, time)->
    time = (time or performance.now()).toFixed(0).padStart(5)
    console.log time + "  " + msg
    return msg
