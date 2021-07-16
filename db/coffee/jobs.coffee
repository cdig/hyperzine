Take ["Iterated"], (Iterated)->

  queues = []
  handlers = {}

  runJobs = Iterated 1, (more)->
    for queue, priority in queues when queue?.length > 0
      {time, type, args} = queue.shift()
      Log "Job — priority: #{priority} type: #{type} time: #{time}"
      handlers[type] ...args
      break unless more()
    null


  Make.async "Jobs", Jobs =

    add: (priority, type, ...args)->
      throw Error "No handler for job type: #{type}" unless handlers[type]?
      queues[priority] ?= []
      queues[priority].push {time: performance.now(), type, args}
      runJobs()

    setHandler: (type, handler)->
      handlers[type] = handler
