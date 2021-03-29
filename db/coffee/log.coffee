Take ["DOOM", "DOMContentLoaded"], (DOOM)->

  maxLogLines = 200
  elm = document.querySelector "main"
  lastTime = 0

  Log = (msg, attrs)->
    time = performance.now().toFixed(0).padStart(8)
    DOOM.prepend elm, DOOM.create "div", null, textContent: time + "  " + msg
    DOOM elm, attrs if attrs?

    while elm.childElementCount > maxLogLines
      DOOM.remove elm.lastChild

  Log.time = (msg, fn)->
    start = performance.now()
    v = fn()
    Log (performance.now() - start).toFixed(1).padStart(6) + " " + msg
    return v

  Log.err = (msg)->
    Log msg, color: "#F00"

  Make "Log", Log
