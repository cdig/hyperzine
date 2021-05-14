{ ipcRenderer } = require "electron"

Take [], ()->
  return if window.isDB # DB has its own IPC system

  Make "IPC", IPC =
    send: (...args)-> ipcRenderer.send ...args
    invoke: (...args)-> ipcRenderer.invoke ...args

    on: (channel, cb)-> ipcRenderer.on channel, cb
    once: (channel, cb)-> ipcRenderer.on channel, cb

    # Promise-based handlers, optimized for use with await
    promise:
      once: (channel)-> new Promise (resolve)-> ipcRenderer.once channel, resolve
