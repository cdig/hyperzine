package hyperzine.panel.files
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.Interactive;
  
  public class IconButton extends Interactive
  {
    private var iconField:SuperTextField;
    
    public function IconButton(iconText:String, clickAction:Function)
    {
      addChild(iconField = new SuperTextField);
      iconField.format.font = "Modern Pictograms";
      iconField.format.color = Draw.UI_C;
      iconField.format.size = 20;
      iconField.setText(iconText);
      
      SuperButton.click(this, clickAction);
      
      resize();
    }
    
    public function resize()
    {
      iconField.y = GUI.ROW/2-iconField.height/2;
    }
  }
}