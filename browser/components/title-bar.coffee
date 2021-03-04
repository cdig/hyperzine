{app} = require "electron"

Take ["DOOM", "Info", "PubSub"], (DOOM, Info, {Sub})->
  name = document.querySelector "[app-name]"
  info = document.querySelector "[app-info]"
  results = document.querySelector "[search-results]"

  DOOM name, textContent: "Hyperzine #{Info.version}"
  DOOM info, textContent: "Rosetta: #{Info.rosetta}"

  Sub "ResultsCount", (count)->
    DOOM results, textContent: count
