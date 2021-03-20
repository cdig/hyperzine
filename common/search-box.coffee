Take ["PubSub", "State", "DOMContentLoaded"], ({Pub, Sub}, State)->

  change = (e)->
    if e.target.value isnt State.search
      State.search = e.target.value
      Pub "Render"

  elm = document.querySelector "search-box input"
  elm.addEventListener "change", change
  elm.addEventListener "input", change

  Sub "Find", ()->
    elm.focus()
