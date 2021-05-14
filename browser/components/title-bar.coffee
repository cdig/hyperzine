Take ["DOOM", "Memory", "DOMContentLoaded"], (DOOM, Memory)->
  name = document.querySelector "[app-name]"
  info = document.querySelector "[app-info]"

  DOOM name, textContent: "Hyperzine • #{Memory "localName"}"
