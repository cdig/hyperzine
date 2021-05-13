Take [], ()->

  memory = {}

  IPC = null
  Memory = null

  MemoryCore = (k, v)->
    return memory[k] if v is undefined

    old = memory[k]
    if v? then memory[k] = v else delete memory[k]

    # IPC and MemoryCore have a circular reference, so we cut that knot here
    IPC.memoryCommitted k, v if IPC ?= Take "IPC"

    # The local instance of Memory doesn't go through IPC, so we just give it a hook
    MemoryCore.localUpdate? k, v, old

  MemoryCore.memory = memory

  MemoryCore.localUpdate = null # Set by the Memory instance running here in the DB

  Make "MemoryCore", MemoryCore
