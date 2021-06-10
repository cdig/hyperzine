Take ["DOOM", "Memory", "DOMContentLoaded"], (DOOM, Memory)->

  oldSize = 1.2

  slider = document.querySelector "[asset-size]"
  scroller = document.querySelector "asset-list"

  slider.oninput = slider.onchange = update = ()->
    document.body.style.setProperty "--browser-asset-size", slider.value + "em"

    scale = slider.value/oldSize
    oldSize = slider.value
    scroller.scrollTop *= scale


  update()
