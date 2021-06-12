Take ["File", "State", "DOMContentLoaded"], (File, State)->
  filesPane = document.querySelector "files-pane"
  fileList = filesPane.querySelector "file-list"

  fileElms = {}

  fileSort = (a, b)-> a.name.localeCompare b.name

  makeFileElms = (tree, depth = 0)->
    for child in tree.children.sort fileSort
      fileElm = fileElms[child.name] ?= File child, depth
      fileList.appendChild fileElm
      if child.children? and depth < 1
        makeFileElms child, depth+1
    null

  Make "FilesPane", FilesPane =
    render: ()->
      makeFileElms State("asset").files
