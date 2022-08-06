Take ["DB", "ADSR", "DOOM", "Memory", "Paths", "State"], (DB, ADSR, DOOM, Memory, Paths, State)->

  input = document.querySelector "tag-entry input"
  suggestionList = document.querySelector "tag-entry suggestion-list"

  focused = false
  highlightIndex = 0
  firstIndex = 0
  lastIndex = 7

  tagHints = {
    "CDIG At Work": "Images of CDIG employees doing their jobs, either in the office or on site."
    "Cartoon": "Things drawn in cartoon style — i.e. not photos, not drafting-style drawings."
  }

  update = ()->
    hasInput = input.value?.length > 0

    matches = []

    asset = State "asset"
    value = input.value.toLowerCase()
    for tag of Memory "tags"
      continue if hasInput and tag.toLowerCase().indexOf(value) is -1
      continue if tag in asset.tags
      matches.push tag

    matches = Array.sortAlphabetic matches

    frag = new DocumentFragment()
    highlightIndex = (highlightIndex + matches.length) % (matches.length)

    truncateLimit = 7 # how many results to show before truncating the list
    scrollLimit = 2 # when truncated, scroll the list if the highlight is this many spaces from the top

    if highlightIndex + scrollLimit >= lastIndex
      lastIndex = Math.min highlightIndex + scrollLimit, matches.length-1
      firstIndex = Math.max 0, lastIndex - truncateLimit

    if highlightIndex < firstIndex + scrollLimit
      firstIndex = Math.max 0, highlightIndex - scrollLimit
      # lastIndex = Math.min highlightIndex + truncateLimit, matches.length

    # firstIndex = Math.max(0, highlightIndex - scrollLimit)
    lastIndex = Math.min firstIndex + truncateLimit, matches.length-1

    for tag, i in matches when i >= firstIndex and i <= lastIndex
      do (tag, i)->
        tagElm = DOOM.create "div", frag,
          class: "tag"
        rainbowElm = DOOM.create "div", tagElm,
          class: "rainbow"
          rainbowBefore: if i is highlightIndex then "" else null
        DOOM.create "span", rainbowElm,
          textContent: tag
        tagElm.addEventListener "mousemove", (e)->
          highlightIndex = i
          slowUpdate()
        tagElm.addEventListener "mousedown", (e)->
          setValue tag

        if i is highlightIndex and tagHints[tag]
          DOOM.create "div", tagElm,
            class: "hint",
            textContent: tagHints[tag]
            rainbowBefore: ""

    suggestionList.replaceChildren frag

    show = focused and matches.length > 0
    suggestionList.style.display = if show then "block" else "none"
    firstIndex = highlightIndex = 0 unless show


  fastUpdate = ADSR 10, update
  slowUpdate = ADSR 20, 20, update

  setValue = (value)->
    if value?.length > 0
      asset = State "asset"
      DB.send "Add Tag", asset.id, value
      Memory "tags.#{value}", value
      input.value = ""


  highlightNext = ()->
    highlightIndex++
    fastUpdate()

  highlightPrev = ()->
    highlightIndex--
    fastUpdate()

  input.addEventListener "focus", (e)->
    focused = true
    firstIndex = highlightIndex = 0
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

        value = if highlighted = suggestionList.querySelector "[rainbow-before]"
          highlighted.textContent
        else
          input.value

        setValue value

        firstIndex = highlightIndex = 0
        fastUpdate()

      when 27 # esc
        firstIndex = highlightIndex = 0
        input.value = ""
        input.blur()

      when 38 # up
        e.preventDefault()
        highlightPrev()

      when 40 # down
        e.preventDefault()
        highlightNext()

      # else
      #   firstIndex = highlightIndex = 0
      #   fastUpdate()
