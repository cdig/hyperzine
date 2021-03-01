Take ["DOOM", "PubSub"], (DOOM, {Sub})->

  results = document.querySelector "[search-results]"

  Sub "ResultsCount", (count)->
    DOOM results, textContent: count
