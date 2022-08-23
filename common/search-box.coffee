Take ["ADSR", "PubSub", "State"], (ADSR, {Pub, Sub}, State)->

  elm = document.querySelector "search-box input"
  return unless elm?

  focused = false

  State "search", tags: [], text: ""

  change = ADSR 1, 1, (e)-> State "search.text", elm.value

  State.subscribe "search.text", false, (v)->
    elm.value = v unless focused

  elm.addEventListener "change", change
  elm.addEventListener "input", change
  elm.onfocus = ()-> focused = true
  elm.onblur = ()-> focused = false

  Sub "find", ()-> elm.focus()
