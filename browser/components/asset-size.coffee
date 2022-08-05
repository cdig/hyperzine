Take ["ADSR", "DOOM", "Memory", "PubSub"], (ADSR, DOOM, Memory, {Pub})->

  newSize = 1
  oldSize = 1

  slider = document.querySelector "[asset-size]"
  scroller = document.querySelector "asset-list"

  update = ADSR 1, 1, ()->
    return unless newSize isnt oldSize
    document.body.style.setProperty "--browser-asset-size", newSize + "em"
    document.body.style.setProperty "--browser-label-size", (1/newSize ** 0.5) + "em"
    DOOM document.body, hideLabels: if newSize <= 0.5 then "" else null
    oldSize = newSize
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
