Take [], ()->

  Make "Iterated", Iterated = (...[timeLimit = 5], iteratedFunction)->

    nextFrameRequested = false
    runAgainNextFrame = false
    didRunThisFrame = false
    ranOutOfTime = false
    startTime = null

    run = ()->
      # Only run once per frame. If we've already run, mark that we want to run again next frame.
      return runAgainNextFrame = true if didRunThisFrame
      didRunThisFrame = true

      # Whenever we run, we need to do some additional work next frame.
      requestNextFrame()

      # Defer the execution of the function *slightly*, to improve batching behaviour
      # when an iterated function is called repeatedly inside a loop (eg: by lib/job.coffee).
      queueMicrotask ()->

        # Now we can actually run the iterated function!
        startTime = performance.now()
        iteratedFunction more

      # Iterated functions are just for side effects — a return value is not needed.
      null


    requestNextFrame = ()->
      return if nextFrameRequested
      nextFrameRequested = true
      requestAnimationFrame nextFrame

    # Whenever someone calls run(), we *always* need to do some cleanup work, and me might
    # also need to call run() again ourselves if there's more iterated work to be done.
    nextFrame = ()->
      doRun = runAgainNextFrame
      nextFrameRequested = false
      runAgainNextFrame = false
      didRunThisFrame = false
      ranOutOfTime = false
      run() if doRun

    # This function will tell the caller whether they're safe to do more work this frame.
    # They'll call it repeatedly in a loop (while doing other work) until either they
    # run out of time and break out of the loop, or run out of work to do and just stop
    # calling us.
    more = (customLimit)->
      ranOutOfTime = performance.now() - startTime > (customLimit or timeLimit)

      if ranOutOfTime
        # Mark that we want to actually do a run() next frame, not just the usual cleanup.
        runAgainNextFrame = true

        # We always need to request a new frame, since the call to more() might come
        # long after the last call to run() if the iterated function is doing something async.
        requestNextFrame()

      return not ranOutOfTime

    return run
