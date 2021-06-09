Take [], ()->

  Make "Iterated", Iterated = (...[limit = 5], cb)-> run = ()->
    startTime = performance.now()
    scheduled = false

    more = ()->
      outOfTime = performance.now() - startTime > limit
      if outOfTime and not scheduled
        scheduled = true
        requestAnimationFrame run
      return outOfTime

    cb more
    null
