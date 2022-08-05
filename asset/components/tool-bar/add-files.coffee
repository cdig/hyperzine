Take ["DB", "Env", "IPC", "Log", "Paths", "State", "Write"], (DB, Env, IPC, Log, Paths, State, Write)->

  elm = document.querySelector "[add-files]"

  elm.onclick = ()->
    if Env.isMac
      res = await IPC.invoke "showOpenDialog",
        properties: ["openDirectory", "openFile", "multiSelections"]
    else
      res = await IPC.invoke "showOpenDialog",
        properties: ["openFile", "multiSelections"] # TODO: Windows can't do a mixed file+directory open dialog!? https://www.electronjs.org/docs/latest/api/dialog#dialogshowopendialogbrowserwindow-options
    unless res.cancelled
      asset = State "asset"
      DB.send "Add Files", asset.id, res.filePaths
