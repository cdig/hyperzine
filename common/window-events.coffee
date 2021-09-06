Take ["IPC"], (IPC)->
  IPC.on "focus", ()-> document.documentElement.classList.remove "blur"
  IPC.on "blur", ()-> document.documentElement.classList.add "blur"
  IPC.on "maximize", ()-> document.documentElement.classList.add "maximize"
  IPC.on "unmaximize", ()-> document.documentElement.classList.remove "maximize"
