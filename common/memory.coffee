Take [], ()->

  if window.isDB
    MemoryCore = await new Promise (resolve)-> Take "MemoryCore", (MemoryCore)-> resolve MemoryCore
    cache = MemoryCore.memory
    commit = MemoryCore
  else
    DB = await new Promise (resolve)-> Take "DB", resolve
    cache = await DB.invoke "memoryInit"
    commit = (k, v)-> DB.send "memory", k, v


  Memory = (k, v)->
    return cache[k] if v is undefined
    commit k, v

  # Convenience
  Memory.change = (k, v)-> Memory k, v if v isnt cache[k]
  Memory.default = (k, v)-> Memory k, v unless cache[k]?

  # Subscriptions
  subscriptions = {}

  Memory.subscribe = (k, runNow, cb)->
    (subscriptions[k] ?= []).push cb
    if runNow
      v = Memory(k)
      cb v, v, k

  Memory.unsubscribe = (k, cb)->
    Array.pull subscriptions[k], cb

  notify = (k, v, old)->
    if subscriptions[k]?
      for cb in subscriptions[k]
        cb v, old, k
    null

  # Note — in the time between the cache loading and now, there might have been
  # some updates from MemoryCore that we missed. Unlikely, but could be a problem.

  if window.isDB
    MemoryCore.localUpdate = (k, v, old)->
      notify k, v, old
  else
    DB.on "memoryCommitted", (k, v)->
      old = cache[k]
      cache[k] = v
      notify k, v, old


  Make "Memory", Memory
