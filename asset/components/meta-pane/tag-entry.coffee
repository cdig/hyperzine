Take ["DB", "Debounced", "DOOM", "Memory", "Paths", "State", "DOMContentLoaded"], (DB, Debounced, DOOM, Memory, Paths, State)->

  input = document.querySelector "tag-entry input"
  suggestionList = document.querySelector "tag-entry suggestion-list"

  focused = false
  highlightIndex = 0

  update = Debounced.raf ()->
    hasInput = input.value?.length > 0

    matches = []

    if hasInput
      asset = State "asset"
      value = input.value.toLowerCase()
      for tag of Memory "tags"
        continue unless tag.toLowerCase().startsWith value
        continue if tag in asset.tags
        matches.push tag

      frag = new DocumentFragment()
      highlightIndex = (highlightIndex + matches.length+1) % (matches.length+1)

      delay = State("rainbow-before-delay") - 4
      State "rainbow-before-delay", delay
      document.body.style.setProperty "--rainbow-delay", "#{delay}ms"


      for tag, i in Array.sortAlphabetic matches
        tagElm = DOOM.create "div", frag, rainbowBefore: if i+1 is highlightIndex then "" else null
        DOOM.create "span", tagElm, textContent: tag
      suggestionList.replaceChildren frag

    show = focused and hasInput and matches.length > 0
    suggestionList.style.display = if show then "block" else "none"
    highlightIndex = 0 unless show


  highlightNext = ()->
    highlightIndex++
    update()

  highlightPrev = ()->
    highlightIndex--
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
        value = input.value

        if highlighted = suggestionList.querySelector "[rainbow-before]"
          value = highlighted.textContent

        if value?.length > 0
          asset = State "asset"
          DB.send "Add Tag", asset.id, value
          Memory "tags.#{value}", value
          input.value = ""

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
