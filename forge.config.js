require("dotenv").config() // Put all sensitive process.env vars in a .env file, which is excluded by .gitignore

module.exports = {
  packagerConfig: {
    appCategoryType: "public.app-category.developer-tools",
    icon: "resources/icon",
    ignore: "(.github|.gitignore|.gitmodules|.sass-cache|asset|browser|build|common|db|lib|main|out|resources|setup-assistant|submodule|temp|forge.config.js|README.md)/",
    osxSign: {
      identity: process.env.OSX_SIGN_IDENTITY,
      entitlements: "resources/entitlements.plist",
      "gatekeeper-assess": false, // Fails: rejected source=Unnotarized Developer ID
      hardenedRuntime: false, // Breaks the app at launch
      type: "distribution"
    },
    // osxNotarize: {
    //   // tool: "notarytool", // Enable this once Xcode 13 is out — it's much faster
    //   appleId: process.env.OSX_NOTARIZE_APPLE_ID,
    //   appleIdPassword: process.env.OSX_NOTARIZE_PASSWORD
    // },
    overwrite: true
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {}
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"]
    }
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: { owner: "cdig", name: "hyperzine" },
        draft: false
        // Put the required GITHUB_TOKEN in a .env file
      }
    }
  ]
}
