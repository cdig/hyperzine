Take ["Memory"], (Memory)->

  elm = document.querySelector "user-name"
  return unless elm?

  Memory.subscribe "user", (v)->
    elm.textContent = v?.name or "Not Logged In"
