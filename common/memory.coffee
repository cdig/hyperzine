Take ["IPC"], (IPC)->

  return unless IPC.db?

  cache = await IPC.db.invoke "memoryInit"

  Memory = (k, v)->
    return cache[k] if v is undefined
    IPC.db.send "memory", k, v

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

  IPC.db.on "memoryCommitted", (k, v)->
    old = cache[k]
    cache[k] = v
    notify k, v, old

  Make "Memory", Memory
