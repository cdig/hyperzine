package hyperzine.asset
{
  import hyperzine.search.SearchQueryController;
  import hyperzine.select.SelectionController;
  import hyperzine.filesystem.BrowserModel;
  import flash.filesystem.File;
  
  public class AssetController
  {
    // LIFECYCLE //////////////////////////////////////////////////////////////////////////////
    
    public static function newAssetByImport()
    {
      BrowserModel.browseForFiles(makeWithFiles, "Select Files For New Asset");
    }
    
    private static function makeWithFiles(files:Array)
    {
      var assetModel:AssetModel = AssetFactory.makeWithFiles(files);
      
      AssetFactory.update(assetModel.id);
      
      SearchQueryController.setQuery(assetModel.info.getName());
      
      SelectionController.setSelection(assetModel);
    }
    
    public static function deleteAsset(assetModel:AssetModel)
    {
      if (SelectionController.getSelection() == assetModel)
        SelectionController.clearSelection()
      
      assetModel.destroy();
      
      AssetsFolder.deleteAsset(assetModel);
    }
    
    
    // ASSETS FOLDER //////////////////////////////////////////////////////////////////////////
    
    public static function setAssetsFolder(assetsFolder:File)
    {
      AssetsFolder.set(assetsFolder);
    }
    
    public static function refreshDropbox()
    {
      AssetsFolder.updateFromDropbox();
    }
    
    
    // DROPBOX ////////////////////////////////////////////////////////////////////////////////

    public static function packAssets():Object
    {
      var packedAssets:Object = {};
      
      for each (var assetModel:AssetModel in AssetModel.assetModels)
        if (assetModel.exists.doesExist())
          packedAssets[assetModel.id] = AssetFactory.pack(assetModel)
      
      return packedAssets;
    }
    
    public static function unpackAssets(packedAssets:Object)
    {
      for each (var packedAsset:Object in packedAssets)
        if (packedAsset != null)
          AssetFactory.unpack(packedAsset);
    }
    
    
    // INFO //////////////////////////////////////////////////////////////////////////////////
    
    public static function getID(assetModel:AssetModel):String
    {
      return assetModel.id;
    }
    
    public static function getName(assetModel:AssetModel):String
    {
      return assetModel.info.getName();
    }
    
    public static function setName(assetModel:AssetModel, newName:String)
    {
      assetModel.info.setName(newName);
    }
    
    // SHOT ///////////////////////////////////////////////////////////////////////////////////
    
    public static function getShot(assetModel:AssetModel):File
    {
      return assetModel.shot.getShot();
    }
    
    // FILES //////////////////////////////////////////////////////////////////////////////////
    
    public static function addFilesByImport(assetModel:AssetModel)
    {
      BrowserModel.browseForFiles(assetModel.files.addFiles, "Add Files To Asset");
    }
    
    public static function addFolderByImport(assetModel:AssetModel)
    {
      BrowserModel.browseForFolder(assetModel.files.addFolder, "Add Folder To Asset");
    }
    
    public static function getFiles(assetModel:AssetModel):Array
    {
      return assetModel.files.getFiles();
    }
    
    public static function setPreview(assetModel:AssetModel, file:File)
    {
      assetModel.shot.createShot(file);
    }
    
    public static function exportAsset(assetModel:AssetModel)
    {
      BrowserModel.browseForFolder(assetModel.files.exportFiles, "Export All Asset Files")
    }
    
    // TAGS ///////////////////////////////////////////////////////////////////////////////////
    
    public static function getTagNames(assetModel:AssetModel):Array
    {
      return assetModel.tags.getTagNames();
    }
    
    public static function assignTagName(assetModel:AssetModel, tagName:String)
    {
      assetModel.tags.assignTagName(tagName);
    }
    
    public static function removeTagName(assetModel:AssetModel, tagName:String)
    {
      assetModel.tags.removeTagName(tagName);
    }
  }
}