Take [], ()->

  Make "Iterated", Iterated = (...[timeLimit = 5], callback)->
    requested = false
    outOfTime = false
    startTime = null

    requestRun = ()->
      return if requested
      requested = true
      requestAnimationFrame run

    run = (time)->
      requested = false
      outOfTime = false
      startTime = time
      callback more
      if outOfTime
        requestRun()
      else
        requested = false
      null

    # This function will tell the caller whether they're safe to do more work this frame.
    # They'll call it repeatedly in a loop (while doing other work) until either they
    # run out of time and break out of the loop, or run out of work to do and just stop
    # calling us.
    more = ()->
      outOfTime = performance.now() - startTime > timeLimit
      return not outOfTime

    return requestRun
