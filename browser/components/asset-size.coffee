Take ["Debounced", "DOOM", "Memory", "PubSub", "DOMContentLoaded"], (Debounced, DOOM, Memory, {Pub})->

  oldSize = 1.2

  slider = document.querySelector "[asset-size]"
  scroller = document.querySelector "asset-list"

  slider.oninput = slider.onchange = update = Debounced.raf ()->
    document.body.style.setProperty "--browser-asset-size", slider.value + "em"

    # This doesn't work because when the number of assets in a row goes up or down,
    # things wrap differently and we end up looking at a whole different set of assets.
    # scale = slider.value/oldSize
    oldSize = slider.value
    # scroller.scrollTop *= scale

    scroller.scrollTo 0, 0

    Pub "Unbuild Cards"


  update()
