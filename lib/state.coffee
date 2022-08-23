Take [], ()->

  state = {}
  subscriptions = {_cbs:[]}

  getAt = (node, path)->
    return [{"":node}, ""] if path is ""
    parts = path.split "."
    k = parts.pop()
    for part in parts
      node = node[part] ?= {}
    [node, k]


  Make.async "State", State = (path = "", v, {immutable = false} = {})->
    [node, k] = getAt state, path

    return node[k] if v is undefined # Just a read

    # It's not safe to take something out of State, mutate it, and commit it again.
    # The immutable option tells us the caller promises they're not doing that.
    # Otherwise, we clone values before reading or writing them.
    v = Function.clone v unless immutable

    if not immutable and v is node[k] and (Object.type(v) or Array.type(v))
      throw "Did you take something out of State, mutate it, and commit it again?"

    throw Error "You're not allowed to set the State root" if path is ""

    old = node[k]

    if v? then node[k] = v else delete node[k]

    if Function.notEquivalent v, old
      queueMicrotask ()->
        localNotify path, v

    return v

  conditionalSet = (path, v, pred)->
    [node, k] = getAt state, path
    doSet = pred node[k], v
    State path, v if doSet
    return doSet

  # These are useful because they return true if a change was made
  State.change = (path, v)-> conditionalSet path, v, Function.notEquivalent
  State.default = (path, v)-> conditionalSet path, v, Function.notExists

  # This is useful because it reduces the need to update State in a loop,
  # which triggers a lot of (possibly pointless) notifications.
  # Reminder that Object.merge doesn't handle arrays, so maybe
  # limit the use of this function to primitives (since it implies immutable).
  State.merge = (path, v)-> State path, (Object.merge v, State path), immutable: true

  # These are useful because it offers a nice syntax for updating existing values in State,
  # with support for async, either mutably or immutably.
  State.update = (path, fn)-> State path, (await fn State path), immutable: true
  State.mutate = (path, fn)-> State path, (await fn State.clone path), immutable: true

  # This is a convenience function for reading something from State that is pre-cloned
  # (if necessary) to avoid mutability issues.
  State.clone = (path)-> Function.clone State path

  State.subscribe = (...[path = "", runNow = true, weak = false], cb)->
    throw "Invalid subscribe path" unless String.type path # Avoid errors if you try say subscribe(runNow, cb)
    [node, k] = getAt subscriptions, path
    ((node[k] ?= {})._cbs ?= []).push cb
    cb._state_weak = weak # ... this is fine 🐕☕️🔥
    cb State path if runNow

  State.unsubscribe = (...[path = ""], cb)->
    [node, k] = getAt subscriptions, path
    throw Error "Unsubscribe failed" unless cb in node[k]._cbs
    Array.pull node[k]._cbs, cb
    null

  localNotify = (path, v)->
    [node, k] = getAt subscriptions, path
    runCbsWithin node[k], v
    runCbs node[k], v, v
    changes = runCbsAbove path, v
    runCbs subscriptions, state, changes

  runCbsWithin = (parent, v)->
    return unless Object.type parent
    for k, child of parent when k isnt "_cbs"
      _v = v?[k]
      runCbsWithin child, _v
      runCbs child, _v, _v
    null

  runCbsAbove = (path, changes)->
    parts = path.split "."
    p = parts.pop()
    changesAbove = {}
    changesAbove[p] = changes
    return changesAbove unless parts.length > 0
    pathAbove = parts.join "."
    [node, k] = getAt subscriptions, pathAbove
    runCbs node[k], State(pathAbove), changesAbove
    runCbsAbove pathAbove, changesAbove

  runCbs = (node, v, changed)->
    if node?._cbs
      dead = []
      for cb in node._cbs
        if cb._state_weak and not v?
          dead.push cb
        else
          cb v, changed
      Array.pull node._cbs, cb for cb in dead
    null
