{ performance } = require "perf_hooks" unless performance?

time = performance.now()

Take "Log", (Log)->
  Log "Initialization Time", null, time
