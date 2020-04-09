package hyperzine.tag
{
  import hyperzine.select.SelectionController;
  import hyperzine.asset.AssetModel;
  import flash.filesystem.File;
  
  public class TagController
  {
    public static function getTagByName(tagName:String):TagModel
    {
      return TagModel.getTagByName(tagName);
    }
    
    public static function enableTagByName(tagName:String)
    {
      TagModel.enableTagByName(tagName);
    }
        
    // FILESYSTEM /////////////////////////////////////////////////////////////////////////////
    public static function setTagsFolder(tagsFolder:File)
    {
      TagModel.setTagsFolder(tagsFolder);
    }
    
    public static function refreshDropbox()
    {
      TagModel.updateFromDropbox();
    }
  }
}