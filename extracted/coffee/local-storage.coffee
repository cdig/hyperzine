Take [], ()->
  db = JSON.parse(window.localStorage["LocalStorage"] or "{}")

  Make "LocalStorage", new Proxy db,
    set: (_, k, v)->
      db[k] = v
      window.localStorage["LocalStorage"] = JSON.stringify db
      return true
