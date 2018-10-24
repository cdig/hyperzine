Take ["DB"], (DB)->

  DB.resultCount ?= 0

  Make "ResultCount", ()->
    Preact.h "result-count", null, Util.String.pluralize DB.resultCount, "%% ASSET", "S"
