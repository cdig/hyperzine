Take [], ()->

  # We can't Take pretty much anything right off the bat, ugh
  DB = null # Depends on IPC, only exists in non-DB windows
  Env = null # Depends on IPC
  IPC = null # Depends on Log
  Printer = null # Only exists in DB

  Log = (msg, ...args)->
    Env ?= Take "Env"

    # If we're in dev, send logs to Main
    if Env?.isDev and IPC ?= Take "IPC"
      IPC.send "log", msg, ...args

    # If we're in DB, send logs to the Printer
    if window.isDB and Printer ?= Take "Printer"
      Printer msg, ...args

    # If we're not in DB, send logs to DB
    if !window.isDB and DB ?= Take "DB"
      DB.send "log", msg, ...args

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

  Make "Log", Log
