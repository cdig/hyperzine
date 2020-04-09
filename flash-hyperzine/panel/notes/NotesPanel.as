package hyperzine.panel.notes
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.panel.PanelBase;
  
  public class NotesPanel extends PanelBase
  {
    private static var field:SuperTextField;
    
    public static function setText(input:String)
    {
      field.setText(input);
    }
    
    public function NotesPanel()
    {
      setLabel("Notes");
      makeField();
    }
    
    public override function resize()
    {
      super.resize();
      
      field.y = GUI.ROW*2;
      field.width = GUI.COL*20;
      field.height = GUI.ROW*16;
    }
    
    private function makeField()
    {
      field = new SuperTextField;
      addChild(field);
      
      field.makeInput();
      field.multiline = true;
      field.wordWrap = true;
      
      field.format.color = Draw.INPUT_C;
      field.applyFormat();
    }
  }
}