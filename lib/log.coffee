{ performance } = require "perf_hooks" unless performance?

Take [], ()->

  # We can't Take pretty much anything right off the bat, ugh
  DB = null # Depends on IPC, only exists in non-DB windows
  Env = null # Depends on IPC in windows
  IPC = null # Depends on Log in windows
  Printer = null # Only exists in DB and Main

  Log = (msg, ...args)->
    Env ?= Take "Env"

    # If we have a log Printer, send logs to the Printer
    if Printer ?= Take "Printer"
      Printer msg, ...args

    # If we're in dev and in a render process, send logs to Main
    if Env?.isDev and Env?.isRender and IPC ?= Take "IPC"
      IPC.send "log", msg, ...args

    # If we're in a render process that's not DB, send logs to DB
    if Env?.isRender and DB ?= Take "DB"
      DB.send "log", msg, ...args

    # If we're in main, send logs to the DB Printer
    if Env?.isMain and IPC ?= Take "IPC"
      IPC.db.send "printer", msg, ...args

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
