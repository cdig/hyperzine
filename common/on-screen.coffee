Take [], ()->
  elms = new WeakMap()

  observer = new IntersectionObserver (entries)->
    for entry in entries
      if cb = elms.get entry.target
        cb entry.target, entry.isIntersecting

  Make "OnScreen", (elm, cb)->
    throw Error "Overwriting existing OnScreen" if elms.has elm
    elms.set elm, cb
    observer.observe elm
