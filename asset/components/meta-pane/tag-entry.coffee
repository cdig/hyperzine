Take ["DB", "ADSR", "DOOM", "Memory", "Paths", "State"], (DB, ADSR, DOOM, Memory, Paths, State)->

  input = document.querySelector "tag-entry input"
  suggestionList = document.querySelector "tag-entry suggestion-list"

  focused = false
  highlightIndex = 0

  update = ADSR 1, 1, ()->
    hasInput = input.value?.length > 0

    matches = []

    if hasInput
      asset = State "asset"
      value = input.value.toLowerCase()
      for tag of Memory "tags"
        continue unless tag.toLowerCase().startsWith value
        continue if tag in asset.tags
        matches.push tag

      matches = Array.sortAlphabetic matches
      truncatedMatches = matches[...10]

      frag = new DocumentFragment()
      highlightIndex = (highlightIndex + truncatedMatches.length+1) % (truncatedMatches.length+1)

      for tag, i in truncatedMatches
        do (tag, i)->
          tagElm = DOOM.create "div", frag, rainbowBefore: if i+1 is highlightIndex then "" else null
          DOOM.create "span", tagElm, textContent: tag
          tagElm.addEventListener "mousemove", (e)->
            highlightIndex = i + 1
            update()
          tagElm.addEventListener "mousedown", (e)->
            setValue tag

      if matches.length > truncatedMatches.length
        truncElm = DOOM.create "span", frag, class: "truncated", textContent: "…"

      suggestionList.replaceChildren frag

    show = focused and hasInput and matches.length > 0
    suggestionList.style.display = if show then "block" else "none"
    highlightIndex = 0 unless show

  setValue = (value)->
    if value?.length > 0
      asset = State "asset"
      DB.send "Add Tag", asset.id, value
      Memory "tags.#{value}", value
      input.value = ""


  highlightNext = ()->
    highlightIndex++
    update()

  highlightPrev = ()->
    highlightIndex--
    update()

  input.addEventListener "mousemove", (e)->
    highlightIndex = 0
    update()

  input.addEventListener "focus", (e)->
    focused = true
    highlightIndex = 0
    update()

  input.addEventListener "blur", (e)->
    focused = false
    update()

  input.addEventListener "change", update
  input.addEventListener "input", update

  input.addEventListener "keydown", (e)->
    switch e.keyCode
      when 13 # return
        e.preventDefault()

        value = if highlighted = suggestionList.querySelector "[rainbow-before]"
          highlighted.textContent
        else
          input.value


        setValue value

        highlightIndex = 0
        update()

      when 27 # esc
        highlightIndex = 0
        input.value = ""
        input.blur()

      when 38 # up
        e.preventDefault()
        highlightPrev()

      when 40 # down
        e.preventDefault()
        highlightNext()

      else
        highlightIndex = 0
        update()
