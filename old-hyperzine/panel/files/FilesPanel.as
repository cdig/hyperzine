package hyperzine.panel.files
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.ScrollingList;
  import hyperzine.select.SelectionController;
  import hyperzine.asset.AssetController;
  import hyperzine.asset.AssetModel;
  import hyperzine.panel.PanelButton;
  import hyperzine.panel.PanelBase;
  import flash.filesystem.File;
  import flash.display.Sprite;

  public class FilesPanel extends PanelBase
  {
    private var scrollingList:ScrollingList;
    private var selectedAsset:AssetModel;
    private var fileViews:Array = [];
    
    private var addFileButton:PanelButton;
    private var addFolderButton:PanelButton;
    
    public function FilesPanel()
    {
      setLabel("Files");
      
      addFileButton = new PanelButton("Add Files");
      SuperButton.click(addFileButton, addFileClick);
      addChild(addFileButton);
      
      addFolderButton = new PanelButton("Add Folder");
      SuperButton.click(addFolderButton, addFolderClick);
      addChild(addFolderButton);
      
      scrollingList = new ScrollingList(13, 24, ["name"]);
      addChild(scrollingList);
      
      SelectionController.addObserver(selectionChanged);
    }
    
    public override function resize()
    {
      super.resize();
      
      addFileButton.y = GUI.ROW*2;
      addFolderButton.x = GUI.COL*7;
      addFolderButton.y = GUI.ROW*2;
      scrollingList.y = GUI.ROW*3;
    }
    
    private function selectionChanged()
    {
      if (selectedAsset != null)
      {
        selectedAsset.files.removeObserver(rebuild);
        selectedAsset = null;
      }
      
      if (!SelectionController.hasSelection())
        return;
      
      selectedAsset = SelectionController.getSelection();
      selectedAsset.files.addObserver(rebuild);
      rebuild();
    }
    
    private function rebuild()
    {
      var files:Array = AssetController.getFiles(selectedAsset);
      
      while(fileViews.length)
        scrollingList.removeItem(fileViews.pop());
      
      for each (var file:File in files)
      {
        var fileView:FileView = new FileView(selectedAsset, file);
        scrollingList.addItem(fileView);
        fileViews.push(fileView);
      }
      
      scrollingList.invalidate();
    }
    
    private function addFileClick()
    {
      AssetController.addFilesByImport(SelectionController.getSelection());
    }
    
    private function addFolderClick()
    {
      AssetController.addFolderByImport(SelectionController.getSelection());
    }
  }
}