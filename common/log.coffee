Take ["IPC"], (IPC)->

  Log = (msg, ...args)->
    IPC.log msg, ...args
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
