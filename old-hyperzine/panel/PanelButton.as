package hyperzine.panel
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.gui.Interactive;
  
  public class PanelButton extends Interactive
  {
    private var field:SuperTextField;
    
    public function PanelButton(label:String)
    {
      makeField(label);
      
      Draw.box(this, 0, 0, field.width, GUI.ROW);
    }
    
    private function makeField(fieldText:String)
    {
      field = new SuperTextField;
      addChild(field);
      
      field.makeInput();
      field.wordWrap = true;
      field.format.color = Draw.UI_C;
      field.setText(fieldText, "center");

      field.width = GUI.COL*6;
      field.height = GUI.ROW;
      field.y = 1;
      
      Draw.shadow(field);
    }
  }
}