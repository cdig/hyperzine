# Hyperzine

An asset management system.

### Building

```
# Global deps:
brew install node sass/sass/sass yarn
npm install -g coffeescript
git submodule update --init --recursive

# Optional — custom Electron build
# Download from: https://github.com/electron/electron/releases/tag/
# Then put it on your PATH, eg:
export ELECTRON_OVERRIDE_DIST_PATH=~/Work/electron/arm64
# (I just include this in my dotfiles)

# Run:
yarn start

# And after that's done and begins watching, in another tab run:
yarn electron
```

### Standards

For all user-configurable settings, the defaults are listed at the top of `db/coffee/config.coffee`.


### TODO

If we're gonna debounce stuff like writing files to disk, we gotta make sure we have a way to finish all that stuff before quitting, so that we don't lose any data.

If things like the assets folder path changes while we're running jobs, that could lead to us reading and writing in the wrong location. Eg: if we create a thumbnail job for a certain asset, then before the job runs the assets folder changes to one where that asset no longer exists. The job will still run, but relative to the new assets folder. While we won't run into this in practice, it's still worth thinking about whether we can change how things are architected so that we don't need to sprinkle little defensive null/conformance checks all throughout the codebase.

### Idea Bucket

https://docs.google.com/document/d/1U1t5ws2_DjsdBBRG5bPBsRgXeyZvx7GDxpZ8oTvNvPc/edit
