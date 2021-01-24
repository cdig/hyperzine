package hyperzine.panel.info
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import flash.display.Sprite;
  import flash.events.MouseEvent;
  
  public class PanelField extends Sprite
  {
    private var units:int;
    private var label:SuperTextField;
    private var field:SuperTextField;
    
    public function PanelField(units:int, editCallback:Function = null)
    {
      this.units = units;
      makeFields();
      
      if (editCallback != null)
        makeEditable(editCallback);
    }
    
    public function setLabel(input:String)
    {
      label.setText(input);
      resize();
    }
    
    public function setText(input:String)
    {
      field.setText(input);
      resize();
    }
    
    public function resize()
    {
      field.scaleX = 1;
      field.scaleX = Math.min(1, GUI.COL*units/(field.width+label.width));
      field.x = label.width;
    }
    
    private function makeFields()
    {
      addChild(field = new SuperTextField);
      addChild(label = new SuperTextField);
      
      field.format.color = label.format.color = Draw.WHITE_C;

      field.height = label .height = 18;
      
      Draw.shadow(field);
      Draw.shadow(label);
    }
    
    // EDITABLE ///////////////////////////////////////////////////////////////////////////////
    private var editCallback:Function;
    private var editing:Boolean;
    
    private function makeEditable(editCallback:Function)
    {
      this.editCallback = editCallback;
      SuperButton.click(this, beginEditing);
      SuperKeyboard.enter(confirmEdit);
    }
    
    private function beginEditing()
    {
      editing = true;
      mouseEnabled = false;
      mouseChildren = true;
      field.format.color = Draw.UI_C;
      field.applyFormat();
      field.makeInput();
      Draw.clearShadow(field);
      
      stage.focus = field;
      var caretIndex:int = Math.round(field.mouseX * field.text.length/field.width);
      field.setSelection(caretIndex, caretIndex);
      
      stage.addEventListener(MouseEvent.MOUSE_DOWN, confirmEdit);
    }
    
    private function confirmEdit(e:MouseEvent = null)
    {
      if (e != null && e.target == field)
        return;
      
      if (editing)
      {
        editing = false;
        mouseEnabled = true;
        mouseChildren = false;
        field.format.color = Draw.WHITE_C;
        field.applyFormat();
        field.makeDynamic();
        Draw.shadow(field);
        
        stage.focus = null;
        stage.removeEventListener(MouseEvent.MOUSE_DOWN, confirmEdit);
        
        resize();
        
        if (editCallback != null)
          editCallback(field.text);
      }
    }
  }
}