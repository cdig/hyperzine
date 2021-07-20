Take [], ()->

  queues = []
  handlers = {}
  watchers = []
  running = false
  count = 0
  delay = 16
  lastTime = null
  lastN = []

  Make.async "Job", Job = (priority, type, ...args)->
    # Priority is optional, and defaults to 0
    if String.type priority
      return Job 0, priority, type, ...args

    throw Error "No handler for job type: #{type}" unless handlers[type]?

    new Promise (resolve)->
      queues[priority] ?= []
      queues[priority].push {type, args, resolve}
      count++
      runJobs()


  Job.handler = (type, handler)-> handlers[type] = handler
  Job.watcher = (watcher)-> watchers.push watcher

  runJobs = ()->
    return if running
    running = true
    lastTime = performance.now()
    delay = 16
    updateWatchers()
    requestAnimationFrame run

  run = ()->
    for queue, priority in queues by -1
      while queue?.length > 0
        {time, type, args, resolve} = queue.shift()
        count--
        resolve handlers[type] ...args # We can't await, or else if a Job creates a new Job inside itself, we'll get stuck
        delay = (performance.now() - lastTime) * 0.1 + delay * 0.9
        return bail() if delay > 20
    running = false
    updateWatchers()

  bail = ()->
    lastTime = performance.now()
    requestAnimationFrame run
    updateWatchers()

  updateWatchers = ()->
    for watcher in watchers
      watcher count, delay
    null
