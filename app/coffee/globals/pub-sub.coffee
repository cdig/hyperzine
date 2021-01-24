Take [], ()->

  subs = {}

  window.Sub = (name, cb)->
    (subs[name] ?= []).push cb

  window.Pub = (name, args...)->
    if subs[name]?
      for handler in subs[name]
        handler args...
    null

  Make "PubSub", {Pub, Sub}
