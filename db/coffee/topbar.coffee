startTime = performance.now()

Take ["DOOM"], (DOOM)->
  topbarItems = document.querySelector "[topbar-items]"
  statusText = DOOM.create "div", topbarItems, textContent: "Loading"

  Make "TopBar", TopBar =
    init: (assets)->
      nAssets = Object.keys(assets).length
      loadTime = Math.round performance.now() - startTime
      DOOM statusText, textContent: "#{nAssets} assets in #{loadTime}ms"
    err: (msg)->
      DOOM statusText, textContent: msg
