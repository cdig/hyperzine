Take ["IPC"], (IPC)->

  if IPC.db? # Normal windows
    cache = await IPC.db.invoke "memoryInit"
    commit = (k, v)-> IPC.db.send "memory", k, v
  else # DB window
    MemoryCore = await new Promise (resolve)-> Take "MemoryCore", (MemoryCore)-> resolve MemoryCore
    cache = MemoryCore.memory
    commit = MemoryCore

  Memory = (k, v)->
    return cache[k] if v is undefined
    commit k, v

  # Convenience
  Memory.change = (k, v)-> Memory k, v if v isnt cache[k]
  Memory.default = (k, v)-> Memory k, v unless cache[k]?

  # Subscriptions
  subscriptions = {}

  Memory.subscribe = (k, ...[dontRunNow], cb)->
    (subscriptions[k] ?= []).push cb
    cb Memory k unless dontRunNow

  Memory.unsubscribe = (k, cb)->
    Array.pull subscriptions[k], cb

  notify = (k, v, old)->
    if subscriptions[k]?
      for cb in subscriptions[k]
        cb v, old
    null

  # Note — in the time between the cache loading and now, there might have been
  # some updates from MemoryCore that we missed. Unlikely, but could be a problem.

  if IPC.db? # Normal windows
    IPC.db.on "memoryCommitted", (k, v)->
      old = cache[k]
      cache[k] = v
      notify k, v, old
  else # DB window
    MemoryCore.localUpdate = (k, v, old)->
      console.log "Here's yo dog"
      console.log cache[k]
      console.log v
      notify k, v, old


  Make "Memory", Memory
