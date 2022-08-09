Take ["Log", "Memory"], (Log, Memory)->

  Memory.subscribe "apiToken", (v)->
    if v?
      fetch "https://www.lunchboxsessions.com/hyperzine/api/login",
        headers: "X-LBS-API-TOKEN": v
      .then (res)-> if res.ok then res.json() else error()
      .then (data)->
        Log "Logged in as #{data.name}", color: "hsl(153, 80%, 41%)" # mint
        Memory.change "user", data
      .catch (err)-> error()

  error = ()->
    Log.err "Login failed"
