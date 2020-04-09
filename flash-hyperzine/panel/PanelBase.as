package hyperzine.panel
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  
  public class PanelBase extends SuperSprite
  {
    private var field:SuperTextField;
    
    public function PanelBase()
    {
      makeField();
    }
    
    public function resize()
    {
      field.y = GUI.ROW*0.5;
    }
    
    public function setLabel(input:String)
    {
      field.setText(input, "left");
    }
    
    private function makeField()
    {
      field = new SuperTextField;
      addChild(field);
      
      field.format.color = Draw.WHITE_C;
      field.format.size = 24;
      
      Draw.shadow(field);
    }
  }
}