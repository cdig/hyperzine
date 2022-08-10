Take ["Log", "Memory", "Read"], (Log, Memory, Read)->

  Memory.subscribe "dataFolder", true, (dataFolder)->
    return unless dataFolder?
    systemFolder =

    if json = Read.file Read.path dataFolder, "System", "Tag Descriptions.json"
      data = JSON.parse json
      Memory "Tag Descriptions", data
