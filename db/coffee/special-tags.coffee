Take ["Memory"], (Memory)->

  specialTags = {
    "Archived"
  }

  Memory "tags.#{tag}", tag for tag of specialTags
  Memory "specialTags", specialTags
