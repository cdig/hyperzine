{ performance } = require "perf_hooks" unless performance?

time = performance.now()

Take "Log", (Log)->
  Log.time.formatted "Initialization Time", time
  Log "Initialization Time 2", null, time
