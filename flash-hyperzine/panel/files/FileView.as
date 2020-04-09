package hyperzine.panel.files
{
  import hyperzine.gui.GUI;
  import hyperzine.gui.Draw;
  import hyperzine.asset.AssetModel;
  import hyperzine.asset.AssetController;
  import hyperzine.filesystem.BrowserModel;
  import flash.filesystem.File;
  
  public class FileView extends SuperSprite
  {
    private var previewButton:IconButton;
    private var exportButton:IconButton;
    private var field:SuperTextField;
    private var model:AssetModel;
    private var file:File;
    
    public function FileView(model:AssetModel, file:File)
    {
      this.model = model;
      this.file = file;
      
      var label:String = file.name;
      if (file.isDirectory)
        label = label + " ƒ";
      
      makeField(label);
      
      addChild(exportButton = new IconButton("D", browseForExport));
      addChild(previewButton = new IconButton("E", makePreview));
      
      resize();
    }
    
    public function resize()
    {
      previewButton.x = 0;
      exportButton.x = previewButton.width;
      field.x = previewButton.width + exportButton.width;
      
      field.scaleX = 1;
      var totalWidth:Number = previewButton.width + exportButton.width + field.width;
      field.scaleX = Math.min(1, GUI.COL*13/(totalWidth));
    }
    
    private function makeField(fieldText:String)
    {
      addChild(field = new SuperTextField);
      
      field.format.color = Draw.WHITE_C;
      field.setText(fieldText, "left");
      
      field.height = 18;
      field.x = 5;
      field.y = 2;

      Draw.shadow(field);
    }
    
    private function browseForExport()
    {
      BrowserModel.browseForFolder(export, "Export Asset Files")
    }
    
    private function export(exportDirectory:File)
    {
      file.copyTo(exportDirectory.resolvePath(file.name), true);
    }
    
    private function makePreview()
    {
      AssetController.setPreview(model, file);
    }
  }
}