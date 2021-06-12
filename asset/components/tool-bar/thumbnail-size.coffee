Take ["DOOM", "Memory", "DOMContentLoaded"], (DOOM, Memory)->

  oldSize = 1

  slider = document.querySelector "[thumbnail-size]"
  scroller = document.querySelector "file-list"

  slider.oninput = slider.onchange = update = ()->
    document.body.style.setProperty "--asset-thumbnail-size", slider.value + "em"

    scale = slider.value/oldSize
    oldSize = slider.value
    scroller.scrollTop *= scale


  update()
