Take ["Memory"], (Memory)->

  Make.async "TagList", TagList = (asset, removeFn)->
    specialTags = Memory "specialTags"
    sortedTags = Array.sortAlphabetic asset.tags

    # Make all the special tags first, so they come at the start of the list
    frag = new DocumentFragment()
    frag.append makeTag tag, removeFn, true  for tag in sortedTags when specialTags[tag]?
    frag.append makeTag tag, removeFn, false for tag in sortedTags when not specialTags[tag]?
    return frag

  makeTag = (tag, removeFn, special)->
    tagItem = DOOM.create "tag-item", null, textContent: tag
    if special then DOOM tagItem, special: ""
    if removeFn? then DOOM.create "span", tagItem, textContent: "x", class: "remove", click: removeFn tag
    tagItem
