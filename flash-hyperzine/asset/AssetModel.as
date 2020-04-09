package hyperzine.asset
{
  public class AssetModel
  {
    static var assetModels:Object = {};
    
    static function getForID(id:String):AssetModel
    {
      return assetModels[id] || new AssetModel(id);
    }
    
    
    
    
    public var id:String;
    
    public var info:AssetInfo;
    public var tags:AssetTags;
    public var shot:AssetShot;
    public var files:AssetFiles;
    
    public var search:AssetSearch;
    public var exists:AssetExists;
    public var gridBox:GridBox;
    
    public function AssetModel(id:String)
    {
      this.id = id;
      
      assetModels[id] = this;
      
      info = new AssetInfo(this);
      tags = new AssetTags(this);
      shot = new AssetShot(this);
      files = new AssetFiles(this);
      
      search = new AssetSearch(this);
      exists = new AssetExists;
      gridBox = new GridBox(this);
    }
    
    public function destroy()
    {
      exists.destroy();
      gridBox.destroy();
      delete assetModels[id];
    }
  }
}