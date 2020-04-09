package hyperzine.tag
{
  import hyperzine.filesystem.AsynchUpdater;
  import hyperzine.panel.tags.TagsPanel;
  import flash.filesystem.File;
  
  public class TagModel
  {
    private static var tags:Object = {};
    private static var asynchUpdater:AsynchUpdater;
    
    static function getTagByName(tagName:String):TagModel
    {
      return tags[tagName] ||= new TagModel(tagName);
    }
    
    static function enableTagByName(tagName:String)
    {
      var tagModel:TagModel = tags[tagName] || new TagModel(tagName);
      tagModel.panelView.enable();
    }
    
    
    // FILESYSTEM /////////////////////////////////////////////////////////////////////////////
    
    static function setTagsFolder(tagsFolder:File)
    {
      asynchUpdater = new AsynchUpdater(tagsFolder);
    }
    
    static function updateFromDropbox()
    {
      asynchUpdater.update(updateFromFolder);
    }
    
    private static function updateFromFolder(tagFolderName:String)
    {
      tags[tagFolderName] ||= new TagModel(tagFolderName);
    }
    
    
    
    
    
    var name:String;
    var panelView:TagPanelView;
    
    public function TagModel(name:String)
    {
      this.name = name;
      panelView = new TagPanelView(this);
      TagsPanel.addTagView(panelView);
    }
    
    function setAssigned()
    {
      panelView.enable();
    }
    
    function unsetAssigned()
    {
      panelView.disable();
    }
  }
}