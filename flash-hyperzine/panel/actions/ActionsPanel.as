package hyperzine.panel.actions
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.asset.AssetModel;
  import hyperzine.asset.AssetController;
  import hyperzine.select.SelectionController;
  import hyperzine.panel.PanelButton;
  import hyperzine.panel.PanelBase;

  public class ActionsPanel extends PanelBase
  {
    private var exportButton:PanelButton;
    
    public function ActionsPanel()
    {
      setLabel("Actions");
      
      exportButton = new PanelButton("Export");
      SuperButton.click(exportButton, exportClick);
      addChild(exportButton);
    }
    
    public override function resize()
    {
      super.resize();
      
      exportButton.y = GUI.ROW*2;
    }
    
    private function exportClick()
    {
      AssetController.exportAsset(SelectionController.getSelection());
    }
  }
}