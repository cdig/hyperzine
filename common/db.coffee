Take ["IPC", "Log"], (IPC, Log)->
  return if window.isDB # The DB process doesn't use this — use Ports instead

  bind = new Promise (resolve)->
    IPC.on "port", ({ports}, {id})->
      resolve [ports[0], id]

  IPC.send "bind-db"

  [db, id] = await bind

  requests = {}
  listeners = {}
  ignoreList = {"memory-broadcast"}
  requestID = 0

  db.onmessage = ({data: [msg, ...data]})->
    if msg is "return"
      returned ...data
    else if l = listeners[msg]
      cb ...data for cb in l
    else if not ignoreList[msg]? # We can safely ignore certain messages dropping
      Log "Message from DB dropped: #{msg}"

  returned = (requestID, resp)->
    resolve = requests[requestID]
    delete requests[requestID]
    resolve resp

  Make "DB", DB =
    on: (msg, cb)-> (listeners[msg] ?= []).push cb
    send: (msg, ...args)->
      requestID++ % Number.MAX_SAFE_INTEGER
      response = new Promise (resolve)-> requests[requestID] = resolve
      db.postMessage [requestID, msg, ...args]
      response
