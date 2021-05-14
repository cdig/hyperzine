Take ["IPC"], (IPC)->
  return if window.isDB # DB can't use this

  bind = new Promise (resolve)->
    IPC.on "port", ({ports}, {id})->
      resolve [ports[0], id]

  IPC.send "bind-db"

  [db, id] = await bind

  invokes = {}
  listeners = {}
  db.onmessage = ({data: [message, ...data]})->
    if message is "return"
      returned ...data
    else if l = listeners[message]
      cb ...data for cb in l
    else
      throw "not sure what to do about this"

  returned = (returnID, resp)->
    resolve = invokes[returnID]
    delete invokes[returnID]
    resolve resp

  Make "DB", DB =
    on: (message, cb)-> (listeners[message] ?= []).push cb
    send: (message, ...args)-> db.postMessage [message, ...args]
    invoke: (fn, ...args)->
      returnID = Math.random().toString()
      response = new Promise (resolve)-> invokes[returnID] = resolve
      db.postMessage ["invoke", returnID, fn, ...args]
      response

    log: (...args)-> db.postMessage ["log", ...args]
