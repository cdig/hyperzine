Take ["ADSR", "DOOM"], (ADSR, DOOM)->

  Make "SuggestionList", SuggestionList = (input, getSuggestions, chooseSuggestion, opts = {})->
    suggestionList = DOOM.create "suggestion-list", input.parentElement

    focused = false
    minHighlightIndex = if opts.alwaysHighlight then 0 else -1
    highlightIndex = minHighlightIndex
    firstIndex = 0
    lastIndex = 7

    update = ()->
      suggestions = getSuggestions input.value

      frag = new DocumentFragment()
      # highlightIndex = (highlightIndex + suggestions.length) % (suggestions.length)
      highlightIndex = Math.clip highlightIndex, minHighlightIndex, suggestions.length-1

      truncateLimit = 7 # how many results to show before truncating the list
      scrollLimit = 2 # when truncated, scroll the list if the highlight is this many spaces from the top

      if highlightIndex + scrollLimit >= lastIndex
        lastIndex = Math.min highlightIndex + scrollLimit, suggestions.length-1
        firstIndex = Math.max 0, lastIndex - truncateLimit

      if highlightIndex < firstIndex + scrollLimit
        firstIndex = Math.max 0, highlightIndex - scrollLimit

      lastIndex = Math.min firstIndex + truncateLimit, suggestions.length-1

      opts.updateCandidate? suggestions[highlightIndex]?.text

      for suggestion, i in suggestions when i >= firstIndex and i <= lastIndex
        do (suggestion, i)->
          suggestionElm = DOOM.create "div", frag,
            class: "suggestion"
          rainbowElm = DOOM.create "div", suggestionElm,
            class: "rainbow"
            rainbowBefore: if i is highlightIndex then "" else null
          DOOM.create "span", rainbowElm,
            textContent: suggestion.text
          suggestionElm.addEventListener "mousemove", (e)->
            highlightIndex = i
            slowUpdate()
          suggestionElm.addEventListener "mousedown", (e)->
            setValue suggestion.text

          if i is highlightIndex and suggestion.hint?
            DOOM.create "div", suggestionElm,
              class: "hint",
              textContent: suggestion.hint
              rainbowBefore: ""

      suggestionList.replaceChildren frag

      show = focused and suggestions.length > 0
      suggestionList.style.display = if show then "block" else "none"
      unless show
        firstIndex = 0
        highlightIndex = minHighlightIndex


    fastUpdate = ADSR 10, update
    slowUpdate = ADSR 20, 20, update

    setValue = (value)->
      if value?.length > 0
        chooseSuggestion value
        input.value = ""

    highlightNext = ()->
      highlightIndex++
      fastUpdate()

    highlightPrev = ()->
      highlightIndex--
      fastUpdate()

    input.addEventListener "focus", (e)->
      focused = true
      firstIndex = 0
      highlightIndex = minHighlightIndex
      fastUpdate()

    input.addEventListener "blur", (e)->
      focused = false
      fastUpdate()

    input.addEventListener "change", fastUpdate
    input.addEventListener "input", fastUpdate

    input.addEventListener "keydown", (e)->
      switch e.keyCode
        when 13 # return
          e.preventDefault()
          if highlighted = suggestionList.querySelector "[rainbow-before]"
            setValue highlighted.textContent
          else if opts.allowSubmitWhenNoMatch
            setValue input.value
          else
            input.blur()

          firstIndex = 0
          highlightIndex = minHighlightIndex
          fastUpdate()


        when 27 # esc
          firstIndex = 0
          highlightIndex = minHighlightIndex
          input.value = ""
          input.blur()

        when 38 # up
          e.preventDefault()
          highlightPrev()

        when 40 # down
          e.preventDefault()
          highlightNext()
