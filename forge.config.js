module.exports = {
  packagerConfig: {
    appCategoryType: "public.app-category.developer-tools",
    icon: "resources/icon",
    ignore: "(asset|browser|build|common|db|lib|main|node_modules|resources|setup-assistant|submodule|temp)/",
    // osxSign: {
    //   type: "distribution",
    //   entitlements: "resources/entitlements.plist"
    // },
    overwrite: true
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "Hyperzine"
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: [
        "darwin"
      ]
    }
  ]
}
