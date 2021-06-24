Take ["Debounced", "PubSub", "State", "DOMContentLoaded"], (Debounced, {Pub, Sub}, State)->

  elm = document.querySelector "search-box input"
  return unless elm?

  change = Debounced (e)->
    Pub "Render" if State.change "search", e.target.value

  elm.addEventListener "change", change
  elm.addEventListener "input", change

  Sub "find", ()-> elm.focus()
