Take ["Job"], (Job)->

  elm = document.querySelector "job-status"
  return unless elm?

  Job.watcher (count, delay)->
    count = String.pluralize count, "%% Job"
    elm.firstChild.textContent = "#{count} Queued"
    elm.lastChild.textContent = "(#{delay|0}ms)"
