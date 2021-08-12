Take ["DOOM", "File", "State", "DOMContentLoaded"], (DOOM, File, State)->
  fileList = document.querySelector "file-list"

  fileElms = {}

  Make.async "FileList", FileList =
    render: ()->
      return unless asset = State "asset"

      frag = new DocumentFragment()
      search = State("search")?.toLowerCase()

      for file in asset.files.children
        makeTreeElm asset, file, frag, search

      fileList.replaceChildren frag


  makeTreeElm = (asset, tree, parent, search, depth = 0)->

    treeElm = DOOM.create "div", parent, class: "tree"

    # We want to cache and reuse File elms because they need to load thumbnails, and that's async.
    fileElm = fileElms[tree.relpath] ?= File tree
    File.update asset, tree, fileElm
    treeElm.appendChild fileElm

    noSearch = (not search?) or (search.length <= 0)
    matchesSearch = tree.name.toLowerCase().search(search) >= 0
    hasVisibleContents = false

    if tree.children?
      childrenElm = DOOM.create "div", treeElm, class: "children"
      for child in tree.children
        childIsVisible = makeTreeElm asset, child, childrenElm, search, depth+1
        hasVisibleContents = true if childIsVisible
      toggle(treeElm, childrenElm) true if hasVisibleContents
      State.subscribe "fileList.#{tree.relpath}.showChildren", toggle treeElm, childrenElm

    isVisible = noSearch or matchesSearch or hasVisibleContents
    DOOM treeElm, display: if isVisible then "block" else "none"

    return isVisible


  toggle = (treeElm, childrenElm)-> (showChildren)->
    v = if showChildren then "" else null
    DOOM treeElm, showChildren: v
