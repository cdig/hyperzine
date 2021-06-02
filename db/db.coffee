Take ["Config", "IPC", "Log"], (Config, IPC, Log)->

  config = Config()
  Log "Loading Config: #{config}"

  switch config
    when true
      IPC.send Log "config-ready"
    when false
      IPC.send Log "open-setup-assistant"
    else
      IPC.send "fatal", "Hyperzine failed to load your saved preferences. To avoid damaging the preferences file, Hyperzine will now close. Please ask Ivan for help."
