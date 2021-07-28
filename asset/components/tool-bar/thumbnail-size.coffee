Take ["ADSR", "DOOM", "Memory", "DOMContentLoaded"], (ADSR, DOOM, Memory)->

  newSize = 1
  oldSize = 1

  slider = document.querySelector "[thumbnail-size]"
  scroller = document.querySelector "file-list"

  update = ADSR 1, 1, ()->
    return unless newSize isnt oldSize
    document.body.style.setProperty "--asset-thumbnail-size", newSize + "em"
    scale = newSize/oldSize
    oldSize = newSize
    scroller.scrollTop *= scale
    Memory "assetThumbnailSize", newSize

  update()

  slider.oninput = slider.onchange = (e)->
    newSize = slider.value
    Memory "assetThumbnailSize", newSize
    update()

  Memory.subscribe "assetThumbnailSize", true, (v)->
    return unless v?
    newSize = v
    slider.value = newSize unless slider.value is newSize
    update()
