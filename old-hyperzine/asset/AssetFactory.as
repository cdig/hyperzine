package hyperzine.asset
{
  import hyperzine.filesystem.DropboxController;
  
  public class AssetFactory
  {
    static function makeWithFiles(files:Array):AssetModel
    {
      var assetModel:AssetModel = AssetModel.getForID(DropboxController.getNextAssetFolderName());
      assetModel.files.addFiles(files);
      assetModel.info.createName();

      return assetModel;
    }
    
    static function update(folderName:String)
    {
      var assetModel:AssetModel = AssetModel.getForID(folderName);
      
      assetModel.info.update();
      assetModel.tags.update();
      assetModel.shot.update();
      assetModel.files.update();
      assetModel.exists.update();
    }
    
    static function pack(assetModel:AssetModel):Object
    {
      var packed:Object = {};
      
      packed.id = assetModel.id;
      packed.name = assetModel.info.getName();
      packed.tags = assetModel.tags.getTagNames();
      packed.fileNames = assetModel.files.getFileNames();
      
      return packed;
    }
    
    static function unpack(packed:Object)
    {
      var assetModel:AssetModel = AssetModel.getForID(packed.id);
      
      assetModel.info.assumeName(packed.name);
      assetModel.tags.assumeTagNames(packed.tags);
      assetModel.files.assumeFileNames(packed.fileNames);
    }
  }
}