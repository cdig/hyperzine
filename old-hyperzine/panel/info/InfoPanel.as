package hyperzine.panel.info
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.panel.PanelBase;
  import hyperzine.asset.LoadedShot;
  import hyperzine.asset.AssetModel;
  import hyperzine.asset.AssetController;
  import hyperzine.select.SelectionController;
  import flash.filesystem.File;
  import io.BinaryLoader;
  
  public class InfoPanel extends PanelBase
  {
    private var editingAsset:AssetModel;
    
    private var assetName:PanelField;
    private var assetFolderID:PanelField;
    private var assetShot:PanelField;
    private var shot:LoadedShot;
    
    public function InfoPanel()
    {
      setLabel("Info");
      
      addChild(assetName = new PanelField(13, rename));
      addChild(assetFolderID = new PanelField(13));
      addChild(assetShot = new PanelField(13));
      addChild(shot = new LoadedShot(resize));
      
      assetName.setLabel("Name: ");
      assetFolderID.setLabel("ID: ");
      assetShot.setLabel("Preview: ");
      
      SelectionController.addObserver(selectionChanged);
    }
    
    public override function resize()
    {
      super.resize();
      
      shot.scaleX = 1;
      shot.width = Math.min(shot.width, GUI.COL*13);
      shot.scaleY = shot.scaleX;
      
      assetName.y = GUI.ROW*2;
      assetFolderID.y = GUI.ROW*3;
      assetShot.y = GUI.ROW*4;
      shot.y = GUI.ROW*5;
    }
    
    private function selectionChanged()
    {
      if (!SelectionController.hasSelection())
      {
        shot.setModel(null);
        return;
      }
      
      editingAsset = SelectionController.getSelection();
      var shotFile:File = AssetController.getShot(editingAsset);
      
      assetName.setText(AssetController.getName(editingAsset));
      assetFolderID.setText(AssetController.getID(editingAsset));
      assetShot.setText(shotFile ? "" : "None");
      shot.setModel(editingAsset);
    }
    
    private function rename(newName:String)
    {
      AssetController.setName(editingAsset, newName);
    }
  }
}