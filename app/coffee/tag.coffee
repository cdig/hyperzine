Take ["Globals"], (SearchTermCleaner)->

  tags = {}

  Make "Tag",
    add: (tag)->
      tags[tag] = true

    all: ()-> Object.keys(tags).sort()
