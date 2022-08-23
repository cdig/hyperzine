Take ["Memory", "State", "SuggestionList", "TagList"], (Memory, State, SuggestionList, TagList)->

  getSuggestions = (value)->
    value = value.toLowerCase()
    hasInput = value.length > 0
    for tag in Array.sortAlphabetic Object.keys Memory("tags")
      continue if hasInput and tag.toLowerCase().indexOf(value) is -1
      suggestion = text: tag
      suggestion.hint = hint if hint = Memory "Tag Descriptions.#{tag}"
      suggestion

  chooseSuggestion = (value)->
    State.update "search", (search)-> text: "", tags: search.tags.concat value

  input = document.querySelector "search-box input"

  input.addEventListener "keydown", (e)->
    switch e.keyCode
      when 8 # delete
        if input.value is ""
          State.update "search.tags", (tags)-> Array.butLast tags

  SuggestionList input, getSuggestions, chooseSuggestion

  tagList = document.querySelector "search-box tag-list"

  removeTag = (tag)->
    State.mutate "search.tags", (tags)->
      Array.pull tags, tag

  State.subscribe "search.tags", (tags)->
    tagList.replaceChildren TagList tags, noSort: true, removeFn: removeTag
