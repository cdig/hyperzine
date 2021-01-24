package hyperzine.gui
{
  import flash.text.TextFieldAutoSize;
  
  public class Err extends SuperSprite
  {
    private static var symbol:ErrSymbol;
    
    public function Err()
    {
      addChild(symbol = new ErrSymbol);
      visible = false;
    }
    
    public static function or(message:String)
    {
      trace(message); // In case the error is during a quit
      
      GUI.fail();
      
      symbol.snark.htmlText = snark[int(Math.random()*snark.length)];
      symbol.snark.autoSize = TextFieldAutoSize.CENTER;
      symbol.message.text = message;
      symbol.message.y = symbol.snark.height + GUI.ROW;
      symbol.x = API.inner.width/2;
      symbol.y = API.inner.y + API.inner.height/2 - symbol.height/2;
    }
  }
}

var snark:Array = [
  "Count your blessings.\nAt least it's not <font face='Comic Sans MS'>Comic Sans</font>.",
  "Breakfast isn't breakfast without the fun taste of",
  "You are part of the Rebel Alliance and a traitor.",
  "Nice assets.\nIt'd be a real shame if...",
  "Are you pot-high?\nDrunk on pancakes?",
  "110010101010001002",
  "RTFM"
  ];