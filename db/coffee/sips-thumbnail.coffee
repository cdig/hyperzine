Take ["Iterated", "Log"], (Iterated, Log)->
  childProcess = require "child_process"

  iterating = {}

  iterate = Iterated 2, (more)->
    for source, v of iterating when v?
      {dest, resolve} = v
      iterating[source] = null
      childProcess.exec "sips -Z 640 \"#{source}\" --out \"#{dest}\"", done resolve, dest
      return unless more()
    iterating = {}

  done = (resolve, dest)-> (err, stdout, stderr)->
    if err?
      Log.err err
    else
      resolve dest

  Make "SipsThumbnail", SipsThumbnail = (source, dest)->
    new Promise (resolve)->
      iterating[source] = {dest, resolve}
      iterate()
