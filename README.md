# Hyperzine 2

An asset management system.

### Building

```
# Deps:
brew install node sass/sass/sass yarn
npm install -g coffeescript
git submodule update --init --recursive

# Run:
yarn start

# And after that's done and begins watching, in another tab run:
yarn electron
```

### TODO

https://hackmd.io/bwzFRWZzRIyewIBc1Vf7DQ?both#Example-usage-of-new-API

A robust way to read and write saved data from any process, with some way to subscribe to changes.

If we're gonna debounce stuff like writing files to disk, we gotta make sure we have a way to finish all that stuff before quitting, so that we don't lose any data.


### Idea Bucket

https://docs.google.com/document/d/1U1t5ws2_DjsdBBRG5bPBsRgXeyZvx7GDxpZ8oTvNvPc/edit

Automatically check for "conflicted copy"

When adding an asset, check for node_modules and other excluded files


### Things to test
* Config file missing
* Config file empty
* Config file invalid JSON
* Config file valid, no path to dropbox
