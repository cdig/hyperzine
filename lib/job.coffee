Take [], ()->

  handlers = {}
  watchers = []
  running = false
  lastTime = null
  lastN = []

  Make.async "Job", Job = (priority, type, ...args)->
    # Priority is optional, and defaults to 0
    if String.type priority
      return Job 0, priority, type, ...args

    throw Error "No handler for job type: #{type}" unless handlers[type]?

    new Promise (resolve)->
      Job.queues[priority] ?= []
      Job.queues[priority].push {type, args, resolve}
      Job.count++
      Job.runJobs()

  Job.queues = []
  Job.count = 0
  Job.delay = 0


  Job.handler = (type, handler)-> handlers[type] = handler
  Job.watcher = (watcher)-> watchers.push watcher

  Job.runJobs = ()->
    return if running
    running = true
    lastTime = performance.now()
    Job.delay = 16
    updateWatchers()
    requestAnimationFrame run

  run = ()->
    dirty = false
    for queue, priority in Job.queues by -1
      while queue?.length > 0
        dirty = true
        {time, type, args, resolve} = queue.shift()
        Job.count--
        resolve handlers[type] ...args # We can't await, or else if a Job creates a new Job inside itself, we'll get stuck
        Job.delay = (performance.now() - lastTime) * 0.1 + Job.delay * 0.9
        return bail() if Job.delay > 30 # Don't let the frame rate crater
    running = false
    # If any jobs ran this frame, we should run at least one more time, in case any jobs that we ran created new jobs at a higher priority.
    Job.runJobs() if dirty
    updateWatchers()

  bail = ()->
    lastTime = performance.now()
    requestAnimationFrame run
    updateWatchers()

  updateWatchers = ()->
    for watcher in watchers
      watcher Job.count, Job.delay
    null
