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
        Log "Missing DB port handler: #{msg}", color: "#F00"

  Make "Ports", Ports =
    on: (msg, cb)->
      if listeners[msg]? then throw Error "DB Port message #{msg} already has a listener"
      listeners[msg] = cb

    send: (msg, ...args)->
      for id, port of ports
        port.postMessage [msg, ...args]
      null

    fromMain: (msg, ...args)->
      if fn = listeners[msg]
        fn ...args

    # close: (id)->
    #   ports[id].close()
    #   delete ports[id]
