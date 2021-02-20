Take [], ()->
  Make "SearchTermCleaner", (input)->
    input = input.join " " if input instanceof Array
    input.toLowerCase().replace /-_/g, " "
