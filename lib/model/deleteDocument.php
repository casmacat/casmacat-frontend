<?php


if ($argc != 3) {
    print("Usage: exportLog.php <fileId> <jobId>");
}
else {
    
    $fileId = $argv[1];
    $jobId = $argv[2];

    require_once '../../inc/config.inc.php';    

    INIT::obtain();

    require_once INIT::$UTILS_ROOT.'/log.class.php';
    require_once INIT::$MODEL_ROOT.'/Database.class.php';   

    include_once INIT::$MODEL_ROOT . "/casQueries.php";
    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
    
    ini_set('memory_limit', '8000M');
      
    $db = Database::obtain(INIT::$DB_SERVER, INIT::$DB_USER, INIT::$DB_PASS, INIT::$DB_DATABASE);
    $db->connect();	
      
    resetDocument($jobId, $fileId);
    
    ini_set('memory_limit', '128M');
    print "END";
    return 0;
  
}
?>
