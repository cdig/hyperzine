Take ["IPC", "Log", "Printer"], (IPC, Log, Printer)->

  IPC.on "log", (e, ...args)-> Log ...args
  IPC.on "printer", (e, ...args)-> Printer ...args
