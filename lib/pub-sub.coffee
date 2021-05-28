Take [], ()->

  subs = {}

  Sub = (name, cb)->
    (subs[name] ?= []).push cb

  Pub = (name, args...)->
    if subs[name]?
      for handler in subs[name]
        handler args...
    null

  Make "PubSub", {Pub, Sub}
