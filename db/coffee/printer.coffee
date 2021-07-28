Take ["DOOM", "Ports", "DOMContentLoaded"], (DOOM, Ports)->

  maxLogLines = 5000
  printer = document.querySelector "log-printer"

  Printer = (msg, attrs, time)->
    time = (time or performance.now()).toFixed(0).padStart(5)
    console.log time, msg

    elm = DOOM.create "div", null, textContent: time + "  " + msg
    DOOM elm, attrs if attrs?
    DOOM.prepend printer, elm

    while printer.childElementCount > maxLogLines
      DOOM.remove printer.lastChild

    return msg

  Ports.on "printer", Printer
  Make "Printer", Printer
