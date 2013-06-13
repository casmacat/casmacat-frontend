<?php


if ($argc != 3) {
    print("Usage: createInitialTargetReviewer.php <fileTranslator> <fileReviewer>");
}
else {
    
    
    $fileTranslator = $argv[1];
    $fileReviewer = $argv[2];
    
    $translator = simplexml_load_file($fileTranslator);
    $reader = new XMLReader();
    $reader->open($fileTranslator);
    
 
    
    $translations = $translator->finalTargetText->segment;
    
 
    $doc = new DOMDocument();
    $doc->load($fileReviewer );
    
    $domAttribute = $doc->createAttribute('review');
    $domAttribute->value = 'true';
    $doc->getElementsByTagName( "Languages" )->item(0)->appendChild($domAttribute);
  
    $segments = $doc->getElementsByTagName( "initialTargetText" )->item(0)->getElementsByTagName('segment');
    $count = 0;
    foreach( $segments as $segment )
    {
      $segment->nodeValue = $translations[$count];
      $count = $count + 1; 
    }
    $doc->save($fileReviewer);   

    print "END";
    return 0;
  
}
?>
