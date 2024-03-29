Take [], ()->
  elms = new WeakMap()

  observerFn = (entries)->
    for entry in entries
      if cb = elms.get entry.target
        cb entry.target, entry.isIntersecting

  observer = new IntersectionObserver observerFn,
    root: document.querySelector "[on-screen-container]"
    rootMargin: "1000px" # Start loading images a little before they scroll into view

  Make.async "OnScreen", OnScreen = (elm, cb)->
    throw Error "Overwriting existing OnScreen" if elms.has elm
    elms.set elm, cb
    observer.observe elm

  OnScreen.off = (elm)->
    elms.delete elm
