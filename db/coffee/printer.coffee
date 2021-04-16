Take ["DOOM", "DOMContentLoaded"], (DOOM)->

  maxLogLines = 200
  elm = document.querySelector "log-printer"

  Make "Printer", Printer = (msg, attrs, time)->
    time = (time or performance.now()).toFixed(0).padStart(5)
    DOOM.prepend elm, DOOM.create "div", null, textContent: time + "  " + msg
    DOOM elm, attrs if attrs?

    while elm.childElementCount > maxLogLines
      DOOM.remove elm.lastChild

    return msg
