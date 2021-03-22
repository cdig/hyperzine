Take ["DOOM", "Info", "DOMContentLoaded"], (DOOM, Info)->
  name = document.querySelector "[app-name]"
  info = document.querySelector "[app-info]"

  DOOM name, textContent: "Hyperzine #{Info.version}"
