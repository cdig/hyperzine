# Memory supports "deep.paths", but doesn't notify deep subscribers when you write an object. Eg:
#   Memory.subscribe "outer.inner", false, ()-> do stuff
#   Memory "outer", {inner: 5}
# The subscriber won't run because the write doesn't go any deeper than "outer".
# But stuff like this does work:
#   Memory "outer", {inner: 5}
#   Memory.subscribe "outer.inner", true, (v)-> console.log "sub outer.inner:", v
# This could all be improved, but for now let's just be careful about how we write objects.

Take ["Util"], ({getIn})->

  memory = null # Stores all the values committed to Memory
  subscriptions = {} # Notified when specific paths are changed


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
    DB.on "memory-broadcast", (path, v)-> Memory path, v, false


  # We currently have some trouble with infinite loops, so we're doing a bit of special cycle detection
  # This should be removed once we no longer see crazy looping
  recentlyTouchedPaths = {}
  clearPath = (path)-> ()-> delete recentlyTouchedPaths[path]


  Make.async "Memory", Memory = (path, v, doRemoteNotify = true)->

    if not recentlyTouchedPaths[path]?
      recentlyTouchedPaths[path] = 0
      queueMicrotask clearPath path

    if recentlyTouchedPaths[path]++ > 5 # Allow for some slop
      console.log v
      throw Error "Memory update cycle detected for #{path} and value ^"

    [node, k] = getIn memory, path

    return node[k] if v is undefined # Just a read

    old = node[k]

    if v? then node[k] = v else delete node[k]

    if Function.notEquivalent old, v # In theory, this should be enough to stop infinite update cycles
      remoteNotify path, v, old # if doRemoteNotify # enabling this conditional might help avoid infinite update cycles
      localNotify path, v, old

    return v

  conditionalSet = (path, v, pred)->
    [node, k] = getIn memory, path
    doSet = pred node[k], v
    Memory path, v if doSet
    return doSet

  # These are useful because they tell you whether a change was made
  Memory.change = (path, v)-> conditionalSet path, v, Function.notEquivalent
  Memory.default = (path, v)-> conditionalSet path, v, Function.notExists

  Memory.subscribe = (path, runNow, cb)->
    [cb, runNow] = [runNow, true] unless cb?
    [node, k] = getIn subscriptions, path
    ((node[k] ?= {})._cbs ?= []).push cb
    if runNow
      v = Memory path
      cb v, v, k, path

  Memory.unsubscribe = (path, cb)->
    [node, k] = getIn subscriptions, path
    throw Error "Unsubscribe failed" unless cb in node[k]._cbs
    Array.pull node[k]._cbs, cb

  localNotify = (path, v, old)->
    [node, k, parts] = getIn subscriptions, path

    # Notify about the changed value
    if node[k]?._cbs?
      for cb in node[k]._cbs
        cb v, old, k, path

    # Send additional notifications up the branch toward the root
    if parts.length > 0
      _path = parts.join "."
      _old = {} # Note: Only stores the stuff that has changed, not the full previous state
      _old[k] = old
      localNotify _path, Memory(_path), _old

    null
