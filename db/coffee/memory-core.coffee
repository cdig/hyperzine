Take [], ()->

  memory = {}

  IPC = null

  MemoryCore = (k, v)->
    return memory[k] if v is undefined
    if v? then memory[k] = v else delete memory[k]
    IPC.memoryCommitted k, v if IPC ?= Take "IPC" # Circular reference, ugh

  MemoryCore.memory = memory

  Make "MemoryCore", MemoryCore
