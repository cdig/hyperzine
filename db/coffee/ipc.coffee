{ ipcRenderer } = require "electron"

Take ["MemoryCore", "Printer"], (MemoryCore, Printer)->
  ports = {}

  ipcRenderer.on "main-db-invoke", (e, returnID, name, ...args)->
    ipcRenderer.send "main-db-invoke-#{returnID}", invokables[name] ...args

  ipcRenderer.on "port", (e, {id})->
    port = ports[id] = e.ports[0]
    port.onmessage = ({data: [fn, ...args]})->
      if fn is "invoke" then invoke port, ...args else call fn, ...args

  invoke = (port, returnID, name, ...args)->
    if fn = invokables[name]
      v = fn ...args
      port.postMessage ["return", returnID, v]
    else
      Printer "Unknown db invokable: #{name}", color: "#F00"

  call = (name, ...args)->
    if fn = IPC[name]
      fn ...args
    else
      Printer "Unknown db callable: #{name}", color: "#F00"

  invokables =
    memoryInit: ()-> MemoryCore.memory

  Make "IPC", IPC =
    send: (...args)-> ipcRenderer.send ...args
    invoke: (...args)-> ipcRenderer.invoke ...args
    log: Printer
    memory: MemoryCore

    on:     (channel, cb)-> ipcRenderer.on     channel, cb
    once:   (channel, cb)-> ipcRenderer.on     channel, cb

    # Promise-based handlers, optimized for use with await
    promise:
      once: (channel)-> new Promise (resolve)-> ipcRenderer.once channel, resolve

    fatal: (...args)-> ipcRenderer.send "fatal", ...args

    needSetup: ()-> ipcRenderer.send Printer "open-setup-assistant"
    configReady: ()-> ipcRenderer.send Printer "config-ready"

    memoryCommitted: (k, v)->
      for id, port of ports
        port.postMessage ["memoryCommitted", k, v]
      null


    # assets: (assets)-> # send to all ports
    # assetChanged: (asset)-> # send to all ports
    # assetDeleted: (assetId)-> # send to all ports

    # Requests via ports


    # close: (id)->
    #   ports[id].close()
    #   delete ports[id]
