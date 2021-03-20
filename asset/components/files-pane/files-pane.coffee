Take ["DOOM", "Paths", "State", "DOMContentLoaded"], (DOOM, Paths, State)->

  filesPane = document.querySelector "files-pane"
  filesToolbar = filesPane.querySelector "files-toolbar"
  fileCount = filesToolbar.querySelector "[file-count]"
  searchBox = filesToolbar.querySelector "search-box"
  fileList = filesPane.querySelector "file-list"

  fileElms = {}

  makeFileElm = (file)->

    elm = DOOM.create "div", fileList, class: "file"

    img = DOOM.create "img", elm, src: Paths.file State.asset, file

    info = DOOM.create "div", elm, class: "info"

    info = DOOM.create "div", info,
      class: "name"
      textContent: file

    elm


  Make "FilesPane", FilesPane =
    render: ()->

      DOOM fileCount, textContent: String.pluralize State.asset.files.length, "%% File"

      for file in State.asset.files
        fileElm = fileElms[file] ?= makeFileElm file
