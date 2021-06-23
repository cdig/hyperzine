Take ["DOOM", "EditableField", "Memory"], (DOOM, EditableField, Memory)->

  Make "MemoryField", MemoryField = (memoryKey, elm, opts = {})->
    return if DOOM(elm, "memoryField")?
    DOOM elm, memoryField: ""

    focused = false

    elm.addEventListener "focus", (e)-> focused = true
    elm.addEventListener "blur", (e)-> focused = false

    Memory.subscribe memoryKey, true, (value)->
      return unless value
      return if focused
      elm.textContent = value

    setValue = (value)-> Memory memoryKey, value

    EditableField elm, setValue, opts
