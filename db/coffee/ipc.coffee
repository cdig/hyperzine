{ ipcRenderer } = require "electron"

Take ["Printer"], (Printer)->
  ports = {}

  ipcRenderer.on "port", (e, {id})->
    port = ports[id] = e.ports[0]
    port.onmessage = ({data: [name, ...args]})->
      if fn = IPC[name]
        fn ...args
      else
        Printer "Unexpected port message: #{name}", color: "#F00"

  Make "IPC", IPC =

    on:     (channel, cb)-> ipcRenderer.on     channel, cb
    once:   (channel, cb)-> ipcRenderer.on     channel, cb

    # Promise-based handlers, optimized for use with await
    promise:
      once: (channel)-> new Promise (resolve)-> ipcRenderer.once channel, resolve

    fatal: (...args)-> ipcRenderer.send "fatal", ...args

    needSetup: ()-> ipcRenderer.send Printer "db-need-setup"

    # assets: (assets)-> # send to all ports
    # assetChanged: (asset)-> # send to all ports
    # assetDeleted: (assetId)-> # send to all ports

    # Requests via ports

    log: Printer
    config: Config
    configSetupAssetPath: Config.setupAssetPath
    configSetupComplete: Config.setupComplete

    # close: (id)->
    #   ports[id].close()
    #   delete ports[id]
