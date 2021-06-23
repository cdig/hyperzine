Take [], ()->

  Make "Validations", Validations =
    asset:
      name: (v)-> -1 is v.search /[.:/\\]/
    file: (v)-> -1 is v.search /[:/\\]/
