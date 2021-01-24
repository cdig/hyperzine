package hyperzine.tag
{
  import hyperzine.select.SelectionController;
  import hyperzine.asset.AssetController;
  import hyperzine.asset.AssetModel;
  
  public class TagAssigner
  {
    public static function assignTagNameToAsset(tagName:String, assetModel:AssetModel)
    {
      var tagModel:TagModel = TagController.getTagByName(tagName);
      
      AssetController.assignTagName(assetModel, tagModel.name);
      
      if (SelectionController.getSelection() == assetModel)
        tagModel.setAssigned();
    }
    
    public static function removeTagNameFromAsset(tagName:String, assetModel:AssetModel)
    {
      var tagModel:TagModel = TagController.getTagByName(tagName);
      
      AssetController.removeTagName(assetModel, tagModel.name);
      
      if (SelectionController.getSelection() == assetModel)
        tagModel.unsetAssigned();
    }
  }
}