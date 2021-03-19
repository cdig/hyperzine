{app} = require "electron"

Take ["DOOM", "Info", "PubSub", "DOMContentLoaded"], (DOOM, Info, {Sub})->
  name = document.querySelector "[app-name]"
  info = document.querySelector "[app-info]"
  results = document.querySelector "[search-results]"

  DOOM name, textContent: "Hyperzine #{Info.version}"

  Sub "ResultsCount", (count)->
    DOOM results, textContent: count
