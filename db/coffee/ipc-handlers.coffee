Take ["IPC", "Log", "Ports", "Printer"], (IPC, Log, Ports, Printer)->

  IPC.on "log", (e, ...args)-> Log ...args
  IPC.on "printer", (e, ...args)-> Printer ...args
  IPC.on "DB", (e, ...args)-> Ports.fromMain ...args
