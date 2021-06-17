Take ["DOOM", "Memory", "Paths", "State", "DOMContentLoaded"], (DOOM, Memory, Paths, State)->

  input = document.querySelector "tag-entry input"

  # Block newlines in typable fields (needs to be keydown to avoid flicker)
  window.addEventListener "keydown", (e)->
    e.preventDefault() if e.keyCode is 13

  window.addEventListener "keydown", (e)->
    switch e.keyCode
      when 13
        value = input.value
        if value?.length > 0
          asset = State "asset"
          tags = Array.clone Memory "assets.#{asset.id}.tags"
          tags.push value
          Memory "assets.#{asset.id}.tags", tags
          Memory "tags.#{value}", value
          input.value = ""

      when 27
        input.value = ""
