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

### TODO

If we're gonna debounce stuff like writing files to disk, we gotta make sure we have a way to finish all that stuff before quitting, so that we don't lose any data.

### Idea Bucket

https://docs.google.com/document/d/1U1t5ws2_DjsdBBRG5bPBsRgXeyZvx7GDxpZ8oTvNvPc/edit
