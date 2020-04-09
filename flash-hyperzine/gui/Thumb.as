package hyperzine.gui
{
  import flash.events.MouseEvent;
  
  public class Thumb extends SuperSprite
  {
    private var startY:Number;
    private var scrollCallback:Function;
    
    public function Thumb(scrollCallback:Function)
    {
      this.scrollCallback = scrollCallback;
      SuperButton.mouseDown(this, drag);
    }
    
    private function drag()
    {
      startY = mouseY;
      stage.addEventListener(MouseEvent.MOUSE_MOVE, move);
      stage.addEventListener(MouseEvent.MOUSE_UP, drop);
    }
    
    private function move(e:MouseEvent)
    {
      this.y = mouseY - startY;
      scrollCallback();
    }
    
    private function drop(e:MouseEvent)
    {
      stage.removeEventListener(MouseEvent.MOUSE_MOVE, move);
      stage.removeEventListener(MouseEvent.MOUSE_UP, drop);
    }
  }
}