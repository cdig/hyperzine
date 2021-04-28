{ ipcRenderer, webFrame } = require "electron"

Take [], ()->
  bind = new Promise (resolve)->
    ipcRenderer.on "port", ({ports}, data)->
      resolve [ports[0], data.id]

  ipcRenderer.send "bind-db"

  [db, id] = await bind

  Make "IPC", IPC =
    send: (...args)-> ipcRenderer.send ...args
    invoke: (...args)-> ipcRenderer.invoke ...args

    log: (...args)->
      db.postMessage ["log", ...args]
