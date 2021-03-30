Take ["IPC"], (IPC)->

  Log = (msg, attrs)->
    IPC.log msg, attrs

  Log.time = (msg, fn)->
    start = performance.now()
    v = fn()
    Log (performance.now() - start).toFixed(1).padStart(6) + " " + msg
    return v

  Log.err = (msg)->
    Log msg, color: "#F00"

  Make "Log", Log
