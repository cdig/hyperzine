Take ["DOOM", "PubSub", "DOMContentLoaded"], (DOOM, {Pub})->

  document.querySelector("[show-in-finder]").addEventListener "click", (e)->
    Pub "Show In Finder"
