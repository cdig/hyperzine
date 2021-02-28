Take ["DOOM", "PubSub"], (DOOM, {Sub})->

  results = document.querySelector "[search-results]"

  Sub "Results", (filteredAssets)->
    DOOM results, textContent: filteredAssets.length
