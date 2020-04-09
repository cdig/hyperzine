/* Asset Exists
* This class tracks whether an asset folder exists in the dropbox, without causing excessive hits
* to the filesystem. It does this by adding to an instance counter every time an asset is updated
* from the dropbox, and comparing against a static counter. If any asset goes without being seen
* in the dropbox for more than two update cycles, then we know it has ceased to exist. The reason
* for it being two cycles is that new assets may be created before or after the update "pointer",
* meaning they might fall a little out of synch.
*/

package hyperzine.asset
{
  public class AssetExists
  {
    private static var highestAge:int = 0;
    
    private var alive:Boolean = true;
    private var age:int = 0;
    
    public function AssetExists()
    {
      // If we don't start back by one, our static count can be pushed ahead by assets
      // created after the update "pointer".
      age = highestAge-1;
    }
    
    function update()
    {
      if (age == highestAge)
        highestAge++;
      age = highestAge;
    }
    
    function destroy()
    {
      alive = false;
    }
    
    function doesExist():Boolean
    {
      return alive && age >= highestAge-2;
    }
  }
}