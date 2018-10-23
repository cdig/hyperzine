Take ["Util"], (Util)->

  subs = {}

  window.Sub = (name, cb)->
    (subs[name] ?= []).push cb

  window.Unsub = (name, cb)->
    Util.Array.pull subs[name], cb

  window.SyncPub = (name, args...)->
    return unless subs[name]?
    dirty = false
    for sub in subs[name]
      subscriberIsDirty = sub(args...)
      if subscriberIsDirty? and typeof subscriberIsDirty isnt "boolean" then throw "#{name} subscriber must return a boolean or null:\n #{sub}"
      dirty = dirty or subscriberIsDirty
    dirty

  window.Pub = (name, args...)->
    dirty = SyncPub name, args...
    Take("Engine")?.start() if dirty

  
  Make "PubSub", {Pub, Sub, SyncPub, Unsub}
