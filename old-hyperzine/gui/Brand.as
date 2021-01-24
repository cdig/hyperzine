package hyperzine.gui
{
  public class Brand extends SuperSprite
  {
    private var count:int = 32;
    private var gears:Array = [];
    private var shrink:Number = 0.9;
    private var rot:Number = (Math.random() * 130 + 7) * (Math.random() < 0.5 ? 1 : -1);
    private var threshold:Number = 0.01;
    private var speed:Number = 0;
    private var accel:Number = 0;
    private var shift:Number = 0;

    public function Brand()
    {
      var container:SuperSprite = new SuperSprite;
      container.addChild(title);
      addChild(container);
      
      SuperButton.rollOver(container, accelerate, false);
      SuperButton.rollOut(container, decelerate, false);
      SuperEvent.enterFrame(this, spin);
      recurse(topGear);
    }
    
    public function resize()
    {
      x = API.inner.width/2;
      scaleX = scaleY = GUI.ROW/20;
    }
    
    private function recurse(symbol:Gear)
    {
      symbol.rotation = rot;
      gears.push(symbol);
      
      if (--count <= 0)
        return;
      
      var child:Gear = new Gear;
      child.x = child.width/2 * (1-shrink);
      child.scaleX = child.scaleY = shrink;
      symbol.addChild(child);
      
      recurse(child);
    }

    private function spin()
    {
      var i:int = gears.length;
      
      speed = speed * accel + shift;
      
      if (speed > threshold)
      {
        topGear.rotation -= speed/Math.PI;
        
        while(i--)
          gears[i].rotation += speed;
      }
    }
    
    private function accelerate()
    {
      accel = 1.0025;
      shift = 0.00008;
    }
    
    private function decelerate()
    {
      accel = 0.98;
      shift = 0;
    }
  }
}