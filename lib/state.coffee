# This is like Memory (same API), but just for transient state local to each process.
# Hasn't been updated to support "deep.paths" yet

Take [], ()->
  state = {}
  subscriptions = {}

  State = (k, v)->
    return state[k] if v is undefined
    commit k, v

  State.change = (k, v)->
    State k, v if set = v isnt state[k]
    return set

  State.default = (k, v)->
    State k, v if set = not state[k]?
    return set

  State.subscribe = (k, runNow, cb)->
    (subscriptions[k] ?= []).push cb
    if runNow
      v = State(k)
      cb v, v, k

  State.unsubscribe = (k, cb)->
    Array.pull subscriptions[k], cb

  commit = (k, v)->
    old = state[k]
    if v? then state[k] = v else delete state[k]
    notify k, v, old

  notify = (k, v, old)->
    if subscriptions[k]?
      for cb in subscriptions[k]
        cb v, old, k
    null

  Make "State", State
