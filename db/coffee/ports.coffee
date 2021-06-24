Take ["IPC", "Log"], (IPC, Log)->

  ports = {}
  listeners = {}

  IPC.on "port", (e, {id})->
    port = ports[id] = e.ports[0]
    port.onmessage = ({data: [requestID, msg, ...args]})->
      if fn = listeners[msg]
        v = await fn ...args
        port.postMessage ["return", requestID, v]
      else
        Log.err "Missing DB port handler: #{msg}"

  # This is for communication from Main to DB in a way that pretends to be a port.
  # Useful especially for libs that use the DB interface, like Log.
  IPC.on "mainPort", (e, msg, ...args)->
    if fn = listeners[msg]
      fn ...args
      # No return value (yet — implement this if we need it)
    else
      Log.err "Missing DB mainPort handler: #{msg}"

  Make "Ports", Ports =
    on: (msg, cb)->
      if listeners[msg]? then throw Error "DB Port message #{msg} already has a listener"
      listeners[msg] = cb

    send: (msg, ...args)->
      for id, port of ports
        port.postMessage [msg, ...args]
      null

    # close: (id)->
    #   ports[id].close()
    #   delete ports[id]
