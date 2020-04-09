// A propety is a folder like "Name", that contains a subfolder/file/etc for the value

package hyperzine.filesystem
{
  import flash.filesystem.File;
  
  public class Property
  {
    public var value:*;
    
    private var propertyFolder:File;
    private var valueFunction:Function;
    private var modificationTime:Number;
    
    public function Property(propertyFolder:File, valueFunction:Function)
    {
      this.propertyFolder = propertyFolder;
      this.valueFunction = valueFunction;
    }
    
    public function softSet(input:*)
    {
      if (input != null)
        value = input;
    }
    
    public function update(force:Boolean = false):Boolean
    {
      if (!propertyFolder.exists)
        return false;
      
      if (!force && modificationTime == propertyFolder.modificationDate.time)
        return false;
      
      modificationTime = propertyFolder.modificationDate.time;
      
      value = valueFunction(propertyFolder);
      
      return hasValue();
    }
    
    public function hasValue():Boolean
    {
      return value is Array ? value.length > 0 : Boolean(value);
    }
    
    public function addString(input:String)
    {
      if (!input)
        return;
      
      var stringFolder:File = propertyFolder.resolvePath(input);
      stringFolder.createDirectory();
      update(true);
    }
    
    public function changeString(input:String)
    {
      if (!input)
        return;
      
      if (value == null)
        addString(input)
      else if (value != input)
      {
        var oldFolder:File = propertyFolder.resolvePath(value);
        var newFolder:File = propertyFolder.resolvePath(input);
        oldFolder.moveTo(newFolder, true);
        update(true);
      }
    }
    
    public function removeString(input:String)
    {
      if (!input)
        return;
      
      var stringFolder:File = propertyFolder.resolvePath(input);
      stringFolder.deleteDirectory(true);
      update(true);
    }
    
    public function clearValue()
    {
      if (!propertyFolder.exists)
        return;
      
      var listing:Array = propertyFolder.getDirectoryListing();
      
      for each (var f:File in listing)
        f.isDirectory ? f.deleteDirectory(true) : f.deleteFile();
    }
    
    // VALUE FUNCTIONS //////////////////////////////////////////////////////////////////////////////
    
    public static function getFirstFile(input:File):File
    {
      for each (var child:File in input.getDirectoryListing())
        if (!child.isHidden)
          return child;

      return null;
    }
    
    public static function getAllFiles(input:File):Array
    {
      var childFiles:Array = [];
      
      for each (var child:File in input.getDirectoryListing())
        if (!child.isHidden)
          childFiles.push(child);
      
      return childFiles;
    }

    public static function getFirstString(input:File):String
    {
      for each (var child:File in input.getDirectoryListing())
        if (!child.isHidden)
          return child.name;
      
      return null;
    }
    
    public static function getAllStrings(input:File):Array
    {
      var childNames:Array = [];
      
      for each (var child:File in input.getDirectoryListing())
        if (!child.isHidden)
          childNames.push(child.name);
      
      return childNames;
    }
  }
}