Take ["DB", "IPC", "Log", "Paths", "State", "Write", "DOMContentLoaded"], (DB, IPC, Log, Paths, State, Write)->

  elm = document.querySelector "[add-files]"

  elm.onclick = ()->
    res = await IPC.invoke "showOpenDialog",
      properties: ["openDirectory", "openFile", "multiSelections"]
    unless res.cancelled
      asset = State "asset"
      DB.send "Add Files", asset.id, res.filePaths
