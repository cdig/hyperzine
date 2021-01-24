Take [], ()->
  Make "SearchTermCleaner", (input)->
    input.toLowerCase().replace /-_/g, " "
