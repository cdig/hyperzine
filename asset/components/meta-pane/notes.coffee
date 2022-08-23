Take ["DOOM", "EditableField", "Memory", "State"], (DOOM, EditableField, Memory, State)->

  addNote = document.querySelector "add-note input"
  assetHistory = document.querySelector "asset-history"

  addNote.addEventListener "keydown", (e)->
    switch e.keyCode
      when 13 # return
        submit addNote.value.trim()

      when 27 # esc
        cancel()

  error = ()->
    DOOM addNote, disabled: "", opacity: .5, value: "An error occurred while loading notes."

  cancel = ()->
    addNote.value = ""
    addNote.blur()

  submit = (text)->
    return cancel() if text is ""
    addNote.value = ""
    asset = State "asset"
    fetch "https://www.lunchboxsessions.com/hyperzine/api/notes",
      method: "POST"
      headers:
        "Content-Type": "application/json"
        "X-LBS-API-TOKEN": Memory "apiToken"
      body: JSON.stringify asset_id: asset.id, text: text
    .then (res)-> if res.ok then refresh() else error()
    .catch (err)-> error()

  noteList = ({notes, users})->
    frag = new DocumentFragment()
    frag.append makeNote noteData, users for noteData in notes
    return frag

  datetimeFormatFar = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })
  makeNote = ([noteId, userId, createdAt, noteText], users)->
    elm = DOOM.create "div", null, class: "note", noteId: noteId
    DOOM.create "div", elm, class: "text", textContent: noteText
    meta = DOOM.create "div", elm, class: "meta"
    DOOM.create "span", meta, class: "user", textContent: users[userId]
    DOOM.create "span", meta, class: "date", textContent: datetimeFormatFar.format Date.parse createdAt
    elm

  refreshing = false
  refresh = ()->
    return if refreshing
    refreshing = true
    asset = State "asset"
    fetch "https://www.lunchboxsessions.com/hyperzine/api/notes/#{asset.id}",
      headers:
        "X-LBS-API-TOKEN": Memory "apiToken"
    .then (res)-> if res.ok then res.json() else error()
    .then (data)->
      assetHistory.replaceChildren noteList data
      refreshing = false
    .catch (err)-> error()

  Make "Notes", Notes =
    render: ()-> refresh()
