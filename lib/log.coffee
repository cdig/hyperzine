{ performance } = require "perf_hooks" unless performance?

Take [], ()->

  # We can't / shouldn't Take anything, since Log might need to be used *anywhere*
  DB = Env = IPC = Printer = null

  Make.async "Log", Log = (msg, attrs, time)->
    Env ?= Take "Env"

    # Send logs to the local printer
    if Printer ?= Take "Printer"
      Printer msg, attrs, time

    # If we have a port to the DB, send logs to the DB Printer
    if DB ?= Take "DB"
      DB.send "printer", msg, attrs, time

    # If we're in dev, and in a render process, send logs to the main process Printer
    if Env?.isDev and Env?.isRender and IPC ?= Take "IPC"
      IPC.send "printer", msg, attrs, time

    return msg

  Log.time = (msg, fn)->
    start = performance.now()
    v = fn()
    Log.time.formatted msg, performance.now() - start
    return v

  Log.time.async = (msg, fn)->
    start = performance.now()
    v = await fn()
    Log.time.formatted msg, performance.now() - start
    return v

  Log.time.custom = (preMsg)->
    Log preMsg if preMsg
    start = performance.now()
    (postMsg)-> Log.time.formatted postMsg, performance.now() - start

  Log.time.formatted = (msg, time)->
    Log time.toFixed(1).padStart(6) + " " + msg

  Log.err = (msg)->
    Log msg, color: "#F00"
