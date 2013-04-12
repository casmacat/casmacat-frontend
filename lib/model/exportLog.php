<?php

const OFFSET = 100;

if ($argc != 3) {
    print("Usage: exportLog.php <fileId> <jobId>");
}
else {
    $fileId = $argv[1];
    $jobId = $argv[2];

    $startOffset = 0;

    $logListChunk = null;

    require_once '../../inc/config.inc.php';

    INIT::obtain();

    require_once INIT::$UTILS_ROOT.'/log.class.php';
    require_once INIT::$MODEL_ROOT.'/Database.class.php';
    $db = Database::obtain(INIT::$DB_SERVER, INIT::$DB_USER, INIT::$DB_PASS, INIT::$DB_DATABASE);
    $db->connect();

    include_once INIT::$MODEL_ROOT . "/casQueries.php";
    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
	
	
	//filename and source lang
	$queryId = $db->query("SELECT filename, source_language FROM `files` f WHERE f.id = ".$fileId);
	$err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            return $errno * -1;
        }
    $row = $db->fetch($queryId);				
	$src_lang = $row["source_language"];
	$filename ="log_id".$fileId."_".$row["filename"].".xml";
	
	if (!file_exists(INIT::$LOG_DOWNLOAD) || !is_dir(INIT::$LOG_DOWNLOAD)) {
            mkdir(INIT::$LOG_DOWNLOAD);
        }
    $file = INIT::$LOG_DOWNLOAD . "/" . $filename;
	print $file;
	
	$writer = new XMLWriter(); 
    $writer->openURI($file);
    $writer->setIndent(true);
    $writer->startDocument('1.0', 'UTF-8');
    $writer->startElement('logfile'); 
    $writer->writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance'); 
    $writer->writeAttribute('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema');              
    $writer->writeElement('version', 'CASMACAT2');
    $writer->writeElement('jobId', $jobId);         
    $writer->writeElement('username', 'test');        
    $writer->writeElement('fileId', $fileId);
    $writer->writeElement('documentName', $row["filename"]);
    $writer->writeElement('source', $src_lang);
	
    // target language
    $queryId = $db->query("SELECT target FROM `files_job` fj, `jobs` j WHERE j.id = fj.id_job AND fj.id_file = ".$fileId." AND fj.id_job = ".$jobId);
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        return $errno * -1;
    }
    $row = $db->fetch($queryId);        
    $writer->writeElement('target', $row['target']);
	
	//source text
    $queryId = $db->query("SELECT s.segment, s.id FROM `files_job` fj, `segments` s WHERE s.id_file = ".$fileId." AND fj.id_file = ".$fileId." AND fj.id_job = ".$jobId);
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
		return $errno * -1;
    }

    // Source text
    $writer->startElement('sourceText');
                
    $logSegments = array();
    $row = null;
    while ( ($row = $db->fetch($queryId)) != false ) {
		$writer->startElement('segment');
        $writer->writeAttribute('id', $row['id']);
        $writer->text($row['segment']);
        $writer->endElement();      
    }        
    $writer->endElement(); 
	
	//initial target
    $writer->startElement('initialTargetText');
        
    //Check if it is ITP
	$itp = 0;
	$queryId = $db->query("SELECT element_id, data FROM `log_event_header` l, itp_event i WHERE l.type = 'decode' AND l.job_id = ".$jobId." AND l.file_id = ".$fileId." AND i.header_id = l.id");
    while ( ($row = $db->fetch($queryId)) != false ) {
		$itp = 1;
		$json = $row["data"];
		$obj = json_decode($json);
		$nbest = $obj->{'nbest'};
		$inisuggestion = $nbest[0]->target;
		$writer->startElement('segment');
		list($segment, $id, $editarea) = explode("-",$row['element_id']);
		$writer->writeAttribute('id', $id);
		$writer->text($inisuggestion);
        $writer->endElement();            	
	}        
	
    if ($itp == 0) {
		$queryId = $db->query("SELECT id_segment, suggestion FROM `segment_translations` st, `files_job` fj WHERE st.id_job = ".$jobId." AND fj.id_job = ".$jobId." AND fj.id_file = ".$fileId);
        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
			return $errno * -1;
        }        
        $logSegments = array();
        $row = null;
        while ( ($row = $db->fetch($queryId)) != false ) {              
			$writer->startElement('segment');
            $writer->writeAttribute('id', $row['id_segment']);
            $writer->text($row['suggestion']);
            $writer->endElement();                  	
	    }            
    }                 
    $writer->endElement();
	        
    //target
    $writer->startElement('finalTargetText');        
    $queryId = $db->query("SELECT id_segment, translation FROM `segment_translations` st, `files_job` fj WHERE st.id_job = ".$jobId." AND fj.id_job = ".$jobId." AND fj.id_file = ".$fileId);
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
		return $errno * -1;
    }        
    $logSegments = array();
    $row = null;
    while ( ($row = $db->fetch($queryId)) != false ) {
		$writer->startElement('segment');
        $writer->writeAttribute('id', $row['id_segment']);
        $writer->text($row['translation']);  
        $writer->endElement();      
    }                
    $writer->endElement();   
	
	//events
	$writer->startElement('events');
    while ( ($logListChunk = fetchLogChunk($jobId, $fileId, $startOffset, OFFSET)) != false) {
	    //print $startOffset . "\n";
//        if ($startOffset >= 6) die(1);
        //print "NEXT CHUNK:";
        //print_r($logListChunk);
		
		for ($i = 0; $i < count($logListChunk); $i++){
			$writer->startElement($logListChunk[$i]->type);
			//elements of the object
            foreach($logListChunk[$i] as $attribute => $val){                
				if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
					$writer->writeAttribute($attribute, $val);
                }
            }
            $writer->endElement();
		}		
		
        $startOffset += OFFSET;
        $logListChunk = null;

    }	
	$writer->endElement();           
    $writer->endDocument(); 
    $writer->flush();  
	
    $db->close();
}

?>
