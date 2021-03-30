Take ["DOOM", "DOMContentLoaded"], (DOOM)->

  maxLogLines = 200
  elm = document.querySelector "log-printer"

  Printer = (msg, attrs)->
    time = performance.now().toFixed(0).padStart(11) # 11 digits gives us enough room to run continuously for about 1 year
    DOOM.prepend elm, DOOM.create "div", null, textContent: time + "  " + msg
    DOOM elm, attrs if attrs?

    while elm.childElementCount > maxLogLines
      DOOM.remove elm.lastChild

  Make "Printer", Printer
