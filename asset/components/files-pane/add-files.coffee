Take ["DOOM", "IPC", "Log", "DOMContentLoaded"], (DOOM, IPC, Log)->

  elm = document.querySelector "[add-files]"

  elm.onclick = ()->
    res = await IPC.invoke "showOpenDialog",
      # defaultPath: Env.home
      properties: ["openDirectory", "openFile", "multiSelections"]
    unless res.cancelled


      for file in res.filePaths
        Log file
      # Memory "dataFolder", newFolder
