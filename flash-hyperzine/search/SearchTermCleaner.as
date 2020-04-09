package hyperzine.search
{
  public class SearchTermCleaner
  {
    public static function clean(input:String):String
    {
      if (input)
      {
        input = input.replace(/-/g, " ");
        input = input.replace(/_/g, " ");
        input = input.toLowerCase();
      }
      return input;
    }
  }
}