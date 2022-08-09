Take ["DOOM"], (DOOM)->

  Make "EditableField", EditableField = (elm, cb, opts = {})->
    return if DOOM(elm, "editableField")?

    startValue = null

    DOOM elm,
      editableField: ""
      contenteditable: ""
      autocomplete: "off"
      autocorrect: "off"
      autocapitalize: "off"
      spellcheck: "false"

    setValue = ()->
      validate()
      cb? elm.textContent if elm._valid

    validate = ()->
      elm.textContent = elm.textContent.trim()
      if opts.validate?
        elm._valid = opts.validate elm.textContent
        DOOM elm, fieldInvalid: if elm._valid then null else ""
      else
        elm._valid = true

    elm.addEventListener "input", (e)->
      setValue() if opts.saveOnInput

    elm.addEventListener "focus", ()->
      validate()
      startValue = elm.textContent

    elm.addEventListener "blur", ()->
      window.getSelection().empty()
      setValue()

    elm.addEventListener "keydown", (e)->
      switch e.keyCode
        when 13 # return
          e.preventDefault()
          elm.blur()

        when 27 # esc
          elm.textContent = startValue
          e.preventDefault()
          elm.blur()
