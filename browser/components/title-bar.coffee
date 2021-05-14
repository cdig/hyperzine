Take ["DOOM", "Env", "DOMContentLoaded"], (DOOM, Env)->
  name = document.querySelector "[app-name]"
  info = document.querySelector "[app-info]"

  DOOM name, textContent: "Hyperzine #{Env.version}"
