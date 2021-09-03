require("dotenv").config() // Put all sensitive process.env vars in a .env file, which is excluded by .gitignore

module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: "com.lunchboxsessions.hyperzine",
    appCategoryType: "public.app-category.developer-tools",
    derefSymlinks: false, // Check if this fixes the redundant copying of the Electron app when doing a Github Actions build
    icon: "resources/icon",
    ignore: "/@|\.env|\.git|\.sass-cache|asset$|browser$|common$|db$|lib$|main$|out$|resources$|setup-assistant$|submodule$|temp$|forge.config.js|README.md|yarn.lock",
    junk: true,
    osxSign: {
      identity: process.env.OSX_SIGN_IDENTITY,
      entitlements: "resources/entitlements.plist",
      "entitlements-inherit": "resources/entitlements.plist",
      "gatekeeper-assess": false,
      "hardened-runtime": true,
      type: "distribution"
    },
    osxNotarize: {
      appBundleId: "com.lunchboxsessions.hyperzine",
      appleId: process.env.OSX_NOTARIZE_APPLE_ID,
      appleIdPassword: process.env.OSX_NOTARIZE_PASSWORD,
      teamId: process.env.OSX_NOTARIZE_TEAM_ID,
      tool: "notarytool" // Requires Xcode 13
    },
    overwrite: true
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        icon: "https://github.com/cdig/hyperzine/blob/master/resources/icon.ico?raw=true",
        setupExe: "Install Hyperzine",
        setupIcon: "https://github.com/cdig/hyperzine/blob/master/resources/icon.ico?raw=true",
      }
    },
    {
      name: "@electron-forge/maker-zip"
    }
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: { owner: "cdig", name: "hyperzine" },
        draft: false
        // Put the required GITHUB_TOKEN in .env too
      }
    }
  ]
}
