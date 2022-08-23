Take ["DB", "Memory", "State", "SuggestionList"], (DB, Memory, State, SuggestionList)->

  getSuggestions = (value)->
    asset = State "asset"
    value = value.toLowerCase()
    hasInput = value.length > 0
    for tag in Array.sortAlphabetic Object.keys Memory("tags")
      continue if hasInput and tag.toLowerCase().indexOf(value) is -1
      continue if tag in asset.tags
      suggestion = text: tag
      suggestion.hint = hint if hint = Memory "Tag Descriptions.#{tag}"
      suggestion

  chooseSuggestion = (value)->
    asset = State "asset"
    DB.send "Add Tag", asset.id, value
    Memory "tags.#{value}", value

  input = document.querySelector "tag-entry input"

  SuggestionList input, getSuggestions, chooseSuggestion, alwaysHighlight: true, allowSubmitWhenNoMatch: true
