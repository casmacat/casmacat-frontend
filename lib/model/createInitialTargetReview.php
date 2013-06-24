<?php


if ($argc != 3) {
    print("Usage: createInitialTargetReviewer.php <fileTranslator> <fileReviewer>");
}
else {
    
    
    $fileTranslator = $argv[1];
    $fileReviewer = $argv[2];
    

    $reader = new XMLReader();
    $reader->open($fileTranslator);

    
    while ($reader->read()) { 
        if ($reader->name === 'finalTargetText') { 

            $dom = $reader ->expand();
            $finalTargets = $dom->getElementsByTagName('segment');
            $translations = array();
            foreach( $finalTargets as $target )
            {
                array_push($translations, $target->nodeValue);
                
            }
           
            
            break;
        } 
    } 
 
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
