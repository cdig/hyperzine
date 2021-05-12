{ ipcRenderer, webFrame } = require "electron"

Take [], ()->
  bind = new Promise (resolve)->
    ipcRenderer.on "port", ({ports}, {id})->
      resolve [ports[0], id]

  ipcRenderer.send "bind-db"

  [db, id] = await bind

  invokes = {}
  listeners = {}
  db.onmessage = ({data: [message, ...data]})->
    if message is "return"
      returned ...data
    else if l = listeners[message]
      cb ...data for cb in l
    else
      call message, ...data

  returned = (returnID, resp)->
    resolve = invokes[returnID]
    delete invokes[returnID]
    resolve resp

  Make "IPC", IPC =
    send: (...args)-> ipcRenderer.send ...args
    invoke: (...args)-> ipcRenderer.invoke ...args
    log: (...args)-> db.postMessage ["log", ...args]

    db:
      on: (message, cb)-> (listeners[message] ?= []).push cb
      send: (message, ...args)-> db.postMessage [message, ...args]
      invoke: (fn, ...args)->
        returnID = Math.random().toString()
        response = new Promise (resolve)-> invokes[returnID] = resolve
        db.postMessage ["invoke", returnID, fn, ...args]
        response

    config: (...args)-> IPC.db.invoke "config", ...args

    configReady: ()-> ipcRenderer.send "config-ready"
