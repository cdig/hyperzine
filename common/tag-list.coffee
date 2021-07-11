Take ["Memory"], (Memory)->

  Make.async "TagList", TagList = (asset, opts = {})->
    specialTags = Memory "specialTags"
    sortedTags = Array.sortAlphabetic asset.tags

    # Make all the special tags first, so they come at the start of the list
    frag = new DocumentFragment()
    frag.append makeTag tag, opts, true  for tag in sortedTags when specialTags[tag]?
    frag.append makeTag tag, opts, false for tag in sortedTags when not specialTags[tag]?
    return frag

  makeTag = (tag, opts, special)->
    tagItem = DOOM.create "tag-item", null, textContent: tag
    if special then DOOM tagItem, special: ""
    if opts.click? then DOOM tagItem, click: ()-> opts.click tag, tagItem
    if opts.removeFn? then DOOM.create "span", tagItem, textContent: "x", class: "remove", click: opts.removeFn tag
    tagItem
