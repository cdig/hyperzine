Take ["Log", "Memory"], (Log, Memory)->

  # Note — the loginStatus strings are used by login in setup-assistant.coffee,
  # so don't change them unless you update that file too.

  Memory.subscribe "apiToken", true, (v)->
    if v?
      Memory.change "loginStatus", "Logging In"
      res = await fetch "https://www.lunchboxsessions.com/hyperzine/api/login", headers: "X-LBS-API-TOKEN": v
      if res.ok and user = await res.json()
        console.log user
        Log "Logged in as #{user.name}", color: "hsl(153, 80%, 41%)" # mint
        Memory.change "user", user
        Memory.change "loginStatus", "Logged In"
      else
        error()

    else
      Memory.change "user", null
      Memory.change "loginStatus", "Not Logged In"


  error = ()->
    Log.err "Login failed"
    Memory.change "user", null
    Memory.change "loginStatus", "Failed to verify this API Token"
