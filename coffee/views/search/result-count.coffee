Take ["DB", "Search"], (DB, Search)->
  Make "ResultCount", ()->
    Preact.h "result-count", null, Util.String.pluralize Search.resultCount, "%% ASSET", "S"
