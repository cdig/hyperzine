Take ["Debounced", "DOOM", "Memory", "PubSub", "DOMContentLoaded"], (Debounced, DOOM, Memory, {Pub})->

  newSize = 1
  oldSize = 1

  slider = document.querySelector "[asset-size]"
  scroller = document.querySelector "asset-list"

  update = Debounced.raf ()->
    return unless newSize isnt oldSize
    document.body.style.setProperty "--browser-asset-size", newSize + "em"
    document.body.style.setProperty "--browser-label-size", (1/newSize ** 0.5) + "em"
    DOOM document.body, hideLabels: if newSize <= 0.5 then "" else null

    # This doesn't work because when the number of assets in a row goes up or down,
    # things wrap differently and we end up looking at a whole different set of assets.
    # scale = newSize/oldSize
    oldSize = newSize
    # scroller.scrollTop *= scale

    scroller.scrollTo 0, 0
    Pub "Unbuild Cards"

  update()

  slider.oninput = slider.onchange = (e)->
    newSize = slider.value
    Memory "browserThumbnailSize", newSize
    update()

  Memory.subscribe "browserThumbnailSize", true, (v)->
    return unless v?
    newSize = v
    slider.value = newSize unless slider.value is newSize
    update()
