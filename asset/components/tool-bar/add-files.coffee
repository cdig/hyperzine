Take ["IPC", "Log", "Paths", "State", "Write", "DOMContentLoaded"], (IPC, Log, Paths, State, Write)->

  elm = document.querySelector "[add-files]"

  elm.onclick = ()->
    res = await IPC.invoke "showOpenDialog",
      # defaultPath: Env.home
      properties: ["openDirectory", "openFile", "multiSelections"]
    unless res.cancelled
      asset = State "asset"
      filesPath = Paths.files asset
      Write.sync.mkdir filesPath
      for file in res.filePaths
        Write.async.copyInto file, filesPath
