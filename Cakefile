chokidar = require "chokidar"
coffeescript = require "coffeescript"
fs = require "fs"
glob = require "glob"
sass = require "sass"
{execSync, exec} = require "child_process"


# HELPERS #########################################################################################

# Who needs chalk when you can just roll your own ANSI escape sequences
do ()->
  for color, n of red: "31", green: "32", yellow: "33", blue: "34", magenta: "35", cyan: "36"
    do (color, n)-> global[color] = (t)-> "\x1b[#{n}m" + t + "\x1b[0m"

# For ignoring
dotfiles = /(^|[\/\\])\../

# Print out logs with nice-looking timestamps
arrow = blue " → "
time = ()-> new Date().toLocaleTimeString "en-US", hour12: false
log = (msg)-> console.log yellow(time()) + arrow + msg

# Errors should show a notification and beep
err = (title, msg)->
  exec "osascript -e 'display notification \"Error\" with title \"#{title}\"'"
  exec "osascript -e beep"
  log msg

# Given a list of paths to files, get the contents of each file
readFiles = (filePaths)->
  for filePath in filePaths
    fs.readFileSync(filePath).toString()

# Given a file type, a list of paths to files, and the contents of each file,
# return a list of contents with the filename prepended as a comment.
prependFilenames = (comment, paths, contents)->
  for filePath, i in paths
    comment.replace("%%", filePath) + "\n" + contents[i]

# Watch any given paths, and rerun the task whenever those paths are touched
watch = (paths, ...actions)->
  timeout = null
  run = ()->
    for action in actions
      if action instanceof Function then action() else doInvoke action
  chokidar.watch paths, ignored: dotfiles, ignoreInitial: true
  .on "error", ()-> err "Watch #{JSON.stringify paths}", red "Watching #{JSON.stringify paths} failed."
  .on "all", (event, path)->
    clearTimeout timeout
    timeout = setTimeout run, 10

doInvoke = (task)->
  log task
  invoke task


# COMPILATION #####################################################################################

Compilers = {}

Compilers.coffee = (paths, name)->
  start = performance.now()
  contents = readFiles paths
  concatenated = prependFilenames("# %%", paths, contents).join "\n\n\n"
  try
    compiled = coffeescript.compile concatenated, bare: true, inlineMap: true
    fs.writeFileSync "target/#{name}.js", compiled
    log "Compiled #{name}.coffee " + blue "(#{Math.ceil performance.now() - start}ms)"
  catch outerError
    # We hit an error while compiling. To improve the error message, try to compile each
    # individual source file, and see if any of them hit an error. If so, log that.
    for content, i in contents
      try
        coffeescript.compile content, bare: true
      catch innerError
        [msg, mistake, pointer] = innerError.toString().split "\n"
        [_, msg] = msg.split ": error: "
        num = innerError.location.first_line + " "
        pointer = pointer.padStart pointer.length + num.length
        return err "CoffeeScript", [red(paths[i]) + arrow + msg, "", blue(num) + mistake, pointer].join "\n"
    err "CoffeeScript", outerError

Compilers.html = (paths, name)->
  start = performance.now()
  contents = readFiles paths
  contents = prependFilenames("<!-- %% -->", paths, contents) if contents.length > 1
  fs.writeFileSync "target/#{name}.html", contents.join "\n\n"
  log "Compiled #{name}.html " + blue "(#{Math.ceil performance.now() - start}ms)"

Compilers.scss = (paths, name)->
  start = performance.now()
  contents = readFiles paths
  concatenated = prependFilenames("/* %% */", paths, contents).join "\n\n"
  try
    compiled = sass.compileString(concatenated, sourceMap: false).css
    fs.writeFileSync "target/#{name}.css", compiled
    log "Compiled #{name}.scss " + blue "(#{Math.ceil performance.now() - start}ms)"
  catch outerError
    # We hit an error while compiling. To improve the error message, try to compile each
    # individual source file, and see if any of them hit an error. If so, log that.
    # Note — this won't work if you define SCSS variables that are meant to be shared between files!
    # So don't do that. Just use CSS variables.
    for content, i in contents
      try
        compiled = sass.compileString(content, sourceMap: false, alertColor: false).css
      catch innerError
        err "SCSS", innerError.toString()
        # [msg, _, mistake, pointer] = innerError.toString().split "\n"
        # [num, mistake] = mistake.split " │"
        # [_, pointer] = pointer.split " │"
        # pointer = pointer.padStart(pointer.length + num.length)
        # return err "SCSS", [red(paths[i]) + arrow + msg, "", blue(num) + mistake, red(pointer)].join "\n"
    err "SCSS", outerError
    return null


# FUCKS ###########################################################################################


projects =
  asset: {}
  browser: {}
  db: {}
  "setup-assistant": {}
  common:
    deps:
      coffee: [
        "node_modules/take-and-make/**/*.coffee"
        "submodule/bucket/{adsr,monkey-patch,test}.coffee"
        "node_modules/doom/doom.coffee"
        "lib/*.coffee"
      ]
      js: [
        "node_modules/d3-color/dist/d3-color.min.js"
      ]
      scss: [
        "submodule/house-style/vars.css"
        "submodule/house-style/reset.css"
      ]
  main:
    deps:
      coffee: [
        "node_modules/take-and-make/**/*.coffee"
        "submodule/bucket/{adsr,monkey-patch,test}.coffee"
        "lib/*.coffee"
      ]

compileAll = (opts)->
  execSync "mkdir -p target"
  for name, project of projects
    for type in ["coffee", "html", "scss"]

      deps = project.deps?[type] or []
      patterns = deps.concat "#{name}/**/*.#{type}"

      paths = (glob.sync p for p in patterns).flat()
      continue unless paths.length
      Compilers[type] paths, name

      if opts.watch
        do (name, type, patterns)->
          watch patterns, ()->
            paths = (glob.sync p for p in patterns).flat()
            Compilers[type] paths, name

staticDeps = [
  "node_modules/d3-color/dist/d3-color.min.js"
  "static"
]

copyDeps = ()->
  start = performance.now()
  execSync "mkdir -p target"
  for dep in staticDeps
    execSync "cp -R #{dep} target"
  log "Copied deps to target " + blue "(#{Math.ceil performance.now() - start}ms)"


# TASKS ###########################################################################################

task "start", "Set up for development — copy deps, do a new build, watch for changes, and launch electron.", ()->
  copyDeps()
  compileAll watch: true
  doInvoke "electron"

task "build", "Compile everything needed to run Hyperzine into the /target folder", ()->
  copyDeps()
  compileAll watch: false

task "electron", "Launch electron with the most recent build.", ()->
  exec "yarn electron ."

task "bump", "Bump the version number.", ()->
  execSync "yarn version --patch --no-git-tag-version"

task "deploy", "Use electron-forge to publish x64 and arm64 builds.", ()->
  execSync "electron-forge publish --arch=x64,arm64"

task "open", "Launch the most recent deploy build of Hyperzine.", ()->
  execSync "open ./Hyperzine-darwin-arm64/Hyperzine.app"
