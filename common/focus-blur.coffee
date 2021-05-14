Take ["IPC"], (IPC)->
  IPC.on "focus", ()-> document.documentElement.classList.remove "blur"
  IPC.on "blur", ()-> document.documentElement.classList.add "blur"
