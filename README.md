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

### Feature Requests

https://docs.google.com/document/d/1U1t5ws2_DjsdBBRG5bPBsRgXeyZvx7GDxpZ8oTvNvPc/edit

### Idea Bucket

https://news.ycombinator.com/item?id=26194990

Multiple windows
* Library windows, which let you run searches
* Asset windows, which let you edit assets

Continue to store asset metadata in files, to avoid concurrency bugs from syncing

Automatically check for "conflicted copy"

When adding an asset, check for node_modules and other excluded files

Continue to store files in dropbox, not S3, for cost reasons

A way to flag assets as "favourite" — local to each user (computer)
