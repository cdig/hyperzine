
electron = require "electron"
# Memory supports "deep.paths", but doesn't notify deep subscribers when you write an object. Eg:
#   Memory.subscribe "outer.inner", false, ()-> do stuff
#   Memory "outer", {inner: 5}
# The subscriber won't run because the write doesn't go any deeper than "outer".
# But stuff like this does work:
#   Memory "outer", {inner: 5}
#   Memory.subscribe "outer.inner", true, (v)-> console.log "sub outer.inner:", v
# This could all be improved, but for now let's just be careful about how we write objects.

Take ["Util"], ({getIn})->
  subscriptions = {}

  if window.isDB
    MemoryCore = await new Promise (resolve)-> Take "MemoryCore", (MemoryCore)-> resolve MemoryCore
    cache = MemoryCore.memory
    commit = MemoryCore

  else
    DB = await new Promise (resolve)-> Take "DB", resolve
    cache = await DB.invoke "memoryInit"
    commit = (path, v)->
      [node, k] = getIn cache, path
      if v isnt undefined
        # Do an optimistic update locally, and send to the DB
        if v? then node[k] = v else delete node[k]
        DB.send "memory", path, v
      return node[k]

  Memory = (path, v)->
    commit path, v

  conditionalSet = (path, v, pred)->
    [node, k] = getIn cache, path
    set = pred node[k], v
    Memory path, v if set
    return set

  Memory.change = (path, v)-> conditionalSet path, v, Function.isnt
  Memory.default = (path, v)-> conditionalSet path, v, Function.notExists

  Memory.subscribe = (path, runNow, cb)->
    [node, k] = getIn subscriptions, path
    ((node[k] ?= {})._cbs ?= []).push cb
    if runNow
      v = Memory path
      cb v, v, k, path

  Memory.unsubscribe = (path, cb)->
    [node, k] = getIn subscriptions, path
    Array.pull node[k]._cbs, cb

  notify = (path, v, old)->
    [node, k, parts] = getIn subscriptions, path

    # Notify about the changed value
    if node[k]?._cbs?
      for cb in node[k]._cbs
        cb v, old, k, path

    # Send additional notifications up the branch toward the root
    if parts.length > 0
      _path = parts.join "."
      notify _path, Memory(_path), null

    null

  # Note — in the time between the cache loading and now, there might have been
  # some updates from MemoryCore that we missed. Unlikely, but could be a problem.

  if window.isDB
    MemoryCore.localUpdate = (path, v, old)->
      notify path, v, old
  else
    DB.on "memoryCommitted", (path, v)->
      [node, k] = getIn cache, path
      old = node[k]
      node[k] = v
      notify path, v, old

  Make "Memory", Memory
