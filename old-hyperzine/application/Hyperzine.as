/* Hyperzine
* by Ivan Reese
* Version 1.2.0
* 25/06/12
*/

package hyperzine.application
{
  import hyperzine.gui.GUI;
  
  public class Hyperzine extends CDIG
  {
    public function Hyperzine()
    {
      // Having this anywhere else means a weird window shows up when the installed app is run on Mac
      When(API.user, Has.RESIZE, API.fullscreen.enter);
    }
    
    public function Main()
    {
      addChild(new GUI);
      
      ApplicationController.setup();
    }
  }
}