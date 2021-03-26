Take ["DOOM", "DOMContentLoaded"], (DOOM)->

  maxLogLines = 200
  elm = document.querySelector "main"

  Log = (msg, attrs)->
    time = performance.now().toFixed(2).padStart 10
    DOOM.prepend elm, DOOM.create "div", null, textContent: time + "  " + msg
    DOOM elm, attrs if attrs?

    while elm.childElementCount > maxLogLines
      DOOM.remove elm.lastChild

  Log.err = (msg)->
    Log msg, color: "#F00"

  Make "Log", Log
