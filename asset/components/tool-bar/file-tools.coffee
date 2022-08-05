Take ["DOOM", "Memory", "State"], (DOOM, Memory, State)->

  fileTools = document.querySelector "file-tools"
  fileCount = fileTools.querySelector "[file-count]"
  searchBox = fileTools.querySelector "search-box"

  render = ()->
    DOOM fileCount, innerHTML: String.pluralize(State("asset").files.count, "%% <span>File") + "</span>"

  Make.async "FileTools", FileTools =
    render: render
