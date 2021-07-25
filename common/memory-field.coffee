Take ["DOOM", "EditableField", "Memory"], (DOOM, EditableField, Memory)->

  Make "MemoryField", MemoryField = (memoryKey, elm, opts = {})->

    # Flag whether we've been set up on an elm already. That makes it safe to create a
    # MemoryField inside a repeatedly-run Render call.
    return if DOOM(elm, "memoryField")?
    DOOM elm, memoryField: ""

    focused = false

    elm.addEventListener "focus", (e)-> focused = true
    elm.addEventListener "blur", (e)-> focused = false

    Memory.subscribe "Read Only", true, (v)->
      DOOM elm, contenteditable: if v then null else ""

    Memory.subscribe memoryKey, true, (value)->
      return unless value
      return if focused
      elm.textContent = value

    setValue = (value)->
      Memory memoryKey, value
      opts.update? value

    EditableField elm, setValue, opts
