Take ["DOOM", "IPC", "Log", "Paths", "State", "Write", "DOMContentLoaded"], (DOOM, IPC, Log, Paths, State, Write)->

  elm = document.querySelector "[add-files]"

  elm.onclick = ()->
    res = await IPC.invoke "showOpenDialog",
      # defaultPath: Env.home
      properties: ["openDirectory", "openFile", "multiSelections"]
    unless res.cancelled
      asset = State "asset"

      for file in res.filePaths
        Write.async.copyInto file, Paths.files asset
      # Memory "dataFolder", newFolder
