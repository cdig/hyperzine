Take ["Util"], ({getIn})->
  IPC = null

  memory = {}

  MemoryCore = (path, v)->
    # return unless path?.length # Not sure that we want / need this

    [node, k] = getIn memory, path

    if v isnt undefined

      old = node[k]
      if v? then node[k] = v else delete node[k]

      # IPC and MemoryCore have a circular reference, so we cut that knot here
      IPC.broadcast "memoryCommitted", path, v if IPC ?= Take "IPC"

      # The instance of Memory here in the DB doesn't go through IPC, so we call it directly
      MemoryCore.localUpdate? path, v, old

    return node[k]

  MemoryCore.memory = memory
  MemoryCore.localUpdate = null # Set by the Memory instance running here in the DB

  Make "MemoryCore", MemoryCore
