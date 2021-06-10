Take [], ()->

  Make "Iterated", Iterated = (...[timeLimit = 5], cb)-> run = ()->
    startTime = performance.now()
    scheduled = false

    more = ()->
      outOfTime = performance.now() - startTime > timeLimit
      if outOfTime and not scheduled
        scheduled = true
        requestAnimationFrame run
      return not outOfTime

    cb more
    null
