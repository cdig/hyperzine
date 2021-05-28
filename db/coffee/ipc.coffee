{ ipcRenderer } = require "electron"

Take ["MemoryCore", "Log", "Printer"], (MemoryCore, Log, Printer)->
  ports = {}

  ipcRenderer.on "log", (e, ...args)-> Log ...args

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
      Log "Unknown db invokable: #{name}", color: "#F00"

  call = (name, ...args)->
    if fn = callables[name] or IPC[name]
      fn ...args
    else
      Log "Unknown db callable: #{name}", color: "#F00"

  invokables =
    memoryInit: ()-> MemoryCore.memory
    memory: MemoryCore

  callables =
    log: Printer
    memory: MemoryCore

  Make "IPC", IPC =
    send: (...args)-> ipcRenderer.send ...args
    invoke: (...args)-> ipcRenderer.invoke ...args

    on:     (channel, cb)-> ipcRenderer.on     channel, cb
    once:   (channel, cb)-> ipcRenderer.on     channel, cb

    # Promise-based handlers, optimized for use with await
    promise:
      once: (channel)-> new Promise (resolve)-> ipcRenderer.once channel, resolve

    broadcast: (msg, ...args)->
      for id, port of ports
        port.postMessage [msg, ...args]
      null

    # close: (id)->
    #   ports[id].close()
    #   delete ports[id]
