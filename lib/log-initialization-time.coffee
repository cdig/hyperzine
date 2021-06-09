do ()->
  { performance } = require "perf_hooks" unless performance?

  time = performance.now()

  Log = await Take.async "Log"

  Log "Initialization Time", null, time
