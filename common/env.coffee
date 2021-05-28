Take ["IPC"], (IPC)->
  Env = await IPC.invoke "env"

  Env.isMain = false
  Env.isRender = true

  Make "Env", Env
