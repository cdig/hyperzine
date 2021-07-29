Take ["ADSR"], (ADSR)->

  elm = document.querySelector "adsr-status"
  return unless elm?

  ADSR.watcher (count, delay)->
    count = String.pluralize count, "%% ADSR"
    elm.textContent = "#{count} Active"
