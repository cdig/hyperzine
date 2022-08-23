Take ["Memory"], (Memory)->

  Make.async "TagList", TagList = (tags, opts = {})->
    specialTags = Memory "specialTags"
    tags = Array.sortAlphabetic tags unless opts.noSort

    # Make all the special tags first, so they come at the start of the list
    frag = new DocumentFragment()
    frag.append makeTag tag, opts, true  for tag in tags when specialTags[tag]?
    frag.append makeTag tag, opts, false for tag in tags when not specialTags[tag]?
    return frag

  makeTag = (tag, opts, special)->
    elm = DOOM.create "tag-item", null, textContent: tag
    if special then DOOM elm, special: ""

    if opts.click?
      DOOM elm, click: (e)->
        opts.click tag, elm unless Memory "Read Only"

    if opts.removeFn?
      DOOM.create "span", elm, textContent: "x", class: "remove", click: (e)->
        opts.removeFn tag unless Memory "Read Only"

    elm
