package hyperzine.panel.tags
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.ScrollingList;
  import hyperzine.select.SelectionController;
  import hyperzine.asset.AssetController;
  import hyperzine.asset.AssetModel;
  import hyperzine.tag.TagController;
  import hyperzine.tag.TagPanelView;
  import hyperzine.panel.PanelBase;
  import flash.display.Sprite;
  
  public class TagsPanel extends PanelBase
  {
    private static var scrollingList:ScrollingList;
    private static var tagViews:Object = {};
    
    public static function addTagView(tagPanelView:TagPanelView)
    {
      tagViews[tagPanelView.name] = tagPanelView;
      scrollingList.addItem(tagPanelView);
    }
    
    
    
    public function TagsPanel()
    {
      setLabel("Tags");
      
      scrollingList = new ScrollingList(13, 25, ["disabled","name"]);
      addChild(scrollingList);
      
      SelectionController.addObserver(selectionChanged);
    }
    
    public override function resize()
    {
      super.resize();
      
      scrollingList.y = GUI.ROW*2;
    }
    
    private function selectionChanged()
    {
      if (!SelectionController.hasSelection())
        return;
      
      var tagView:TagPanelView;
      for each (tagView in tagViews)
        tagView.disable();
      
      var assetModel:AssetModel = SelectionController.getSelection();
      
      var tagNames:Array = AssetController.getTagNames(assetModel);
      for each (var tagName:String in tagNames)
        TagController.enableTagByName(tagName);
      
      scrollingList.invalidate();
    }
  }
}