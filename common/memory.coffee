Take [], ()->

  memory = null # Stores all the values committed to Memory
  subscriptions = {_cbs:[]} # Notified when specific paths are changed


  if window.isDB

    Ports = await Take.async "Ports"

    # DB owns the cannonical copy of Memory, so we initialize to an empty object to store it all
    memory = {}

    # Other windows will want to initialize themselves with a clone our Memory
    Ports.on "clone-memory", ()-> memory

    # Other windows will notify us when they want to change something in Memory
    Ports.on "memory-notify-db", (path, v)-> Memory path, v

    # When the DB's Memory changes, we should notify other windows
    remoteNotify = (path, v)-> Ports.send "memory-broadcast", path, v

  else

    DB = await Take.async "DB"

    # The DB owns the cannonical copy of Memory, so we initialize to a clone of whatever it has
    memory = await DB.send "clone-memory"

    # Notify the DB whenever anything in our Memory changes
    remoteNotify = (path, v)-> DB.send "memory-notify-db", path, v

    # When the DB's memory changes, it'll notify us
    DB.on "memory-broadcast", (path, v)-> Memory path, v, remote: false


  # This is how we support "deep.paths":
  # Pass a tree-like object, and a dot-separated string of keys.
  # We'll return the penultimate node in the tree, and the final key.
  # (Stopping just above the final node allows you to do assignment.)
  # For uniformity, pass "" to get back the tree root wrapped in a node with a "" key.
  getAt = (node, path)->
    return [{"":node}, ""] if path is ""
    parts = path.split "."
    k = parts.pop()
    for part in parts
      node = node[part] ?= {}
    [node, k]


  Make.async "Memory", Memory = (path = "", v, {remote = true, immutable = false} = {})->
    [node, k] = getAt memory, path

    return node[k] if v is undefined # Just a read

    throw Error "You're not allowed to set the Memory root" if path is ""

    # It's not safe to take something out of Memory, mutate it, and commit it again.
    # The immutable option tells us the caller promises they're not doing that.
    if v? and not immutable
      v = Object.clone v if Object.type v
      v = Array.clone v if Array.type v

    old = node[k]

    if v? then node[k] = v else delete node[k]

    if Function.notEquivalent v, old
      queueMicrotask ()->
        localNotify path, v
        remoteNotify path, v if remote

    return v

  conditionalSet = (path, v, pred)->
    [node, k] = getAt memory, path
    doSet = pred node[k], v
    Memory path, v if doSet
    return doSet

  # These are useful because they return true if a change was made
  Memory.change = (path, v)-> conditionalSet path, v, Function.notEquivalent
  Memory.default = (path, v)-> conditionalSet path, v, Function.notExists

  Memory.subscribe = (...[path = "", runNow = true, weak = false], cb)->
    throw "Invalid subscribe path" unless String.type path # Avoid errors if you try say subscribe(runNow, cb)
    [node, k] = getAt subscriptions, path
    ((node[k] ?= {})._cbs ?= []).push cb
    cb._memory_weak = weak # ... this is fine 🐕☕️🔥
    cb Memory path if runNow

  Memory.unsubscribe = (...[path = ""], cb)->
    [node, k] = getAt subscriptions, path
    throw Error "Unsubscribe failed" unless cb in node[k]._cbs
    Array.pull node[k]._cbs, cb
    null

  localNotify = (path, v)->
    [node, k] = getAt subscriptions, path
    # console.log "  within:"
    runCbsWithin node[k], v
    # console.log "  at path:"
    runCbs node[k], v, v
    # console.log "  above:"
    changes = runCbsAbove path, v
    # console.log "  root:"
    runCbs subscriptions, memory, changes

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
    runCbs node[k], Memory(pathAbove), changesAbove
    runCbsAbove pathAbove, changesAbove

  runCbs = (node, v, changed)->
    if node?._cbs
      dead = []
      for cb in node._cbs
        if cb._memory_weak and not v?
          dead.push cb
        else
          cb v, changed
      Array.pull node._cbs, cb for cb in dead
    null


  # TESTS
  j = (x)-> JSON.stringify x
  sub = (p)->
    console.log p
    Memory.subscribe p, false, (v, changed)-> console.log "    " + p, j(v), j changed
    # Memory.subscribe p, false, (v, changed)-> console.log "    strong  " + p, j(v), j changed
    # Memory.subscribe p, false, true, (v, changed)-> console.log "    weak    " + p, j(v), j changed
  set = (p, v, msg)->
    console.log "\n\n"+msg if msg?
    console.log "\nSET #{p} to", j(v)
    Memory p, v

  # Note: changed only exists when we've modified a subpath rather than the path specified by the listener

  # console.log "SUBSCRIBERS"
  # sub "assets.A.id"
  # sub "assets.A.files"
  # sub "assets.A"
  # sub "assets.B"
  # sub "assets"
  # sub "squibs - should never see this run"
  # sub ""

  # set "assets.A", {id:0, x: 0}, "create an obj"
  # set "assets.A.y", 0, "create a primitive"
  # set "assets.A.id", 1, "change a primitive"
  # # set "assets.A.x.wat", 0, "drill into a primitive!?" — error
  # set "assets.A.id", {in:0}, "replace a primitive with an obj"
  # set "assets.A.id", null, "delete an obj"
  # set "assets.B", {id:9}, "create another obj"
  # set "fork", {}, "create, no subscribers"
  # set "assets", null, "delete an obj with many subs"
  # # set "", 3, "set root — should error"
