package hyperzine.gui
{
  import hyperzine.application.ExitController;
  
  public class Close extends Interactive
  {
    private var radius:Number = 40;
    private var inset:Number = 15;
    private var line:Number = 5;
    
    public function Close()
    {
      graphics.beginFill(Draw.WHITE_C, 0.1);
      graphics.drawCircle(0, 0, radius);
      graphics.endFill();
      
      graphics.lineStyle(2, Draw.UI_C);
      graphics.moveTo(-line, inset);
      graphics.lineTo( line, inset);
      graphics.moveTo(0, -line+inset);
      graphics.lineTo(0,  line+inset);
      rotation = 45;
      
      SuperButton.click(this, ExitController.exit);
      out();
    }
    
    public function resize()
    {
      x = API.outer.right;
      y = API.outer.top;
    }
    
    protected override function over()
    {
      Automate({on:this, alpha:3, time:0.1});
    }
    
    protected override function out()
    {
      Automate({on:this, alpha:1, time:0.5});
    }
  }
}