Take ["DB", "Search"], (DB, Search)->
  Make "ResultCount", ()->
    Preact.h "result-count", null, String.pluralize Search.resultCount, "%% ASSET", "S"
