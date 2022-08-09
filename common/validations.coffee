Take [], ()->

  Make "Validations", Validations =
    asset:
      name: (v)-> -1 is v.search(/[:/\\]/) and v[0] isnt "."
    file: (v)-> -1 is v.search /[:/\\]/
