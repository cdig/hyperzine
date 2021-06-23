Take ["Iterated", "Log"], (Iterated, Log)->
  childProcess = require "child_process"

  iterating = {}

  iterate = Iterated 2, (more)->
    for source, v of iterating when v?
      {resolve, dest, ext, size} = v
      iterating[source] = null
      ext = "jpeg" if ext is "jpg" # sips expects jpeg as the format, not jpg
      childProcess.exec "sips -s format #{ext} -Z #{size} \"#{source}\" --out \"#{dest}\"", done resolve, dest
      return unless more()
    iterating = {}

  done = (resolve, dest)-> (err, stdout, stderr)->
    if err?
      Log.err err
    else
      resolve dest

  Make "SipsThumbnail", SipsThumbnail = (source, dest, size, ext)->
    new Promise (resolve)->
      iterating[source] = {resolve, dest, ext, size}
      iterate()
