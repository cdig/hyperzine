Take ["DOOM"], (DOOM)->

  Make "EditableField", EditableField = (elm, cb, opts = {})->
    return if DOOM(elm, "editableField")?

    DOOM elm,
      editableField: ""
      contenteditable: ""
      autocomplete: "off"
      autocorrect: "off"
      autocapitalize: "off"
      spellcheck: "false"

    setValue = ()->
      cb elm.textContent.trim() if elm._valid

    elm.addEventListener "input", (e)->
      if opts.validate?
        elm._valid = opts.validate elm.textContent.trim()
        DOOM elm, fieldInvalid: if elm._valid then null else ""
      else
        elm._valid = true
      setValue() if opts.saveOnInput

    elm.addEventListener "blur", ()->
      window.getSelection().empty()
      setValue()

    elm.addEventListener "keydown", (e)->
      switch e.keyCode
        when 13
          e.preventDefault()
          elm.blur()
