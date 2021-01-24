Take ["Globals"], ()->
  db = JSON.parse(window.localStorage["DB"] or "{}")

  Make "DB", new Proxy db,
    set: (_, k, v)->
      db[k] = v
      window.localStorage["DB"] = JSON.stringify db
      return true
