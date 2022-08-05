Take ["ADSR", "PubSub", "State"], (ADSR, {Pub, Sub}, State)->

  elm = document.querySelector "search-box input"
  return unless elm?

  focused = false

  change = ADSR 1, 1, (e)-> State "search", elm.value

  State.subscribe "search", false, (v)->
    elm.value = v unless focused

  elm.addEventListener "change", change
  elm.addEventListener "input", change
  elm.onfocus = ()-> focused = true
  elm.onblur = ()-> focused = false

  Sub "find", ()-> elm.focus()
