<?php


//if ($argc != 3) {
//    print("Usage: exportLog.php <fileId> <jobId>");
//}
//else {
    
    $fileId = $argv[1];
    $jobId = $argv[2];

    $startOffset = 0;

    //require_once INIT::$'../../inc/config.inc.php';

    INIT::obtain();

//    require_once INIT::$UTILS_ROOT.'/log.class.php';
//    require_once INIT::$MODEL_ROOT.'/Database.class.php';
    $db = Database::obtain(INIT::$DB_SERVER, INIT::$DB_USER, INIT::$DB_PASS, INIT::$DB_DATABASE);
    $db->connect();

//    include_once INIT::$MODEL_ROOT . "/casQueries.php";
//    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
//    include_once INIT::$UTILS_ROOT . "/Tools.class.php";
    
    ini_set('memory_limit', '8000M');
    
    $startTime = Tools::getCurrentMillis();
    //print "Start: ".$startTime."\n";
	
	
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
    //print "File: ".$file."\n";
	
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
     
    
    
    //Check if it is ITP
    $itp = 0;
    $queryId = $db->query("SELECT element_id FROM `log_event_header` l, itp_event i WHERE l.type = 'decode' AND l.job_id = ".$jobId." AND l.file_id = ".$fileId." AND i.header_id = l.id LIMIT 1,1");
    while ( ($row = $db->fetch($queryId)) != false ) {
        $itp = 1;
        break;
    }
    
    $writer->startElement('Languages');
    $writer->writeAttribute('source', $src_lang);
	
    // target language
    $queryId = $db->query("SELECT target FROM `files_job` fj, `jobs` j WHERE j.id = fj.id_job AND fj.id_file = ".$fileId." AND fj.id_job = ".$jobId);
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        return $errno * -1;
    }
    $row = $db->fetch($queryId);        
    $writer->writeAttribute('target', $row['target']);		
    
    $writer->writeAttribute('task', "post-editing");
	
    if ($itp == 1){
	$writer->writeAttribute('gui', "ITP");
    }
	
    $writer->endElement(); 
	
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
        $writer->text(html_entity_decode($row['segment'], ENT_QUOTES, 'UTF-8'));
        $writer->endElement();      
    }        
    $writer->endElement(); 

    //initial target
    $writer->startElement('initialTargetText');
        
    if ($itp == 1) {
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
    }
    if ($itp == 0) {
	$queryId = $db->query("SELECT id_segment, suggestion FROM `segment_translations` st, `files_job` fj WHERE st.id_job = fj.id_job AND fj.id_job = ".$jobId." AND fj.id_file = ".$fileId." ORDER BY id_segment");
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
            $writer->text(html_entity_decode($row['suggestion']));
            $writer->endElement();                  	
        }            
            
    }                 
    $writer->endElement();  

    //target
    $writer->startElement('finalTargetText');        
    $queryId = $db->query("SELECT id_segment, translation FROM `segment_translations` st, `files_job` fj WHERE st.id_job = fj.id_job AND fj.id_job = ".$jobId." AND fj.id_file = ".$fileId." ORDER BY id_segment");
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
        $writer->text(html_entity_decode($row['translation'], ENT_QUOTES, 'UTF-8'));  
        $writer->endElement();      
    }                
    $writer->endElement();   

    //$headerTime = Tools::getCurrentMillis();
    //print "Header: ".($headerTime-$startTime)."\n";
    
    //events
    $writer->startElement('events');
    
    /*$queryId = $db->query("SELECT COUNT(*) AS total FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'");
    $row = $db->fetch($queryId);
    $total = $row["total"];
    print "Total: ".$total."\n";
    */
    
    $writer->flush();
    
    //config_event 
    $q = "SELECT h.id as id, h.job_id as job_id, h.file_id as file_id, h.element_id as element_id, h.x_path as x_path, h.time as time, h.type as type, "
            . "c.config"
        . " FROM log_event_header h, config_event c WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = c.header_id ORDER BY h.time, h.id ASC";

    $queryId = $db->query($q); 
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
       
     
    $configRow = null;
    $configEvents = array();
    while ( ($configRow = $db->fetch($queryId)) != false ) {
        
        $configRowAsObject = snakeToCamel($configRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($configRowAsObject, true));

        $configEvent = new LogEvent($jobId, $fileId, $configRowAsObject);     
        $configEvent->configData($configRowAsObject);
        //log::doLog("CASMACAT: fetchLogChunk(): configEvent: " . print_r($configEvent,true));
        
        array_push($configEvents, $configEvent); 
    }
    
    if(!empty($configEvents))
    {
        //log::doLog("CASMACAT: configEvents: " . print_r($configEvents, true));
        $count_config = 0;
        $len_config = count($configEvents);
    }
    else $len_config = 0;
    
    
     //-------------------------------------------------------------------------------
    
    //deleting_suggestion_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id as job_id, h.file_id as file_id, h.element_id as element_id, h.x_path as x_path, h.time as time, h.type as type, "
            . "d.which"
        . " FROM log_event_header h, deleting_suggestion_event d WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = d.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $deleteRow = null;
    $deleteEvents = array();
    while ( ($deleteRow = $db->fetch($queryId)) != false ) {
        
        $deleteRowAsObject = snakeToCamel($deleteRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($deleteRowAsObject, true));

        $deleteEvent = new LogEvent($jobId, $fileId, $deleteRowAsObject);     
        $deleteEvent->deleteData($deleteRowAsObject);
        
        array_push($deleteEvents, $deleteEvent); 
    }
    if(!empty($deleteEvents))
    {
        //log::doLog("CASMACAT: deleteEvents: " . print_r($deleteEvents, true));
        $countDeletes = 0;
        $lenDeletes = count($deleteEvents);
        //print $lenDeletes;
    }
    else $lenDeletes = 0;
    
   
    
    //-------------------------------------------------------------------------------
    
    
    //fixation_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id as job_id, h.file_id as file_id, h.element_id as element_id, h.x_path as x_path, h.time as time, h.type as type, "
            . "f.t_time as t_time, f.x as x, f.y as y, f.duration as duration, f.character, f.offset as offset"
        . " FROM log_event_header h, fixation_event f WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = f.header_id ORDER BY h.time, h.id ASC");
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $fixationRow = null;
    $fixationEvents = array();
    while ( ($fixationRow = $db->fetch($queryId)) != false ) {
        
        $fixationRowAsObject = snakeToCamel($fixationRow);        
        

        $fixationEvent = new LogEvent($jobId, $fileId, $fixationRowAsObject);     
        $fixationEvent->fixationData($fixationRowAsObject);
        
        array_push($fixationEvents, $fixationEvent); 
    }
    
    if(!empty($fixationEvents))
    {
        $countFixations = 0;
        $lenFixations = count($fixationEvents);
    }
    else $lenFixations = 0;
    
    //-------------------------------------------------------------------------------
    
    
    
    //gaze_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", g.t_time, g.lx, g.ly, g.rx, g.ry, g.l_dil, g.r_dil, g.l_dil, g.l_char, g.l_offset, g.r_char, g.r_offset"
        . " FROM log_event_header h, gaze_event g WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = g.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $gazeRow = null;
    $gazeEvents = array();
    while ( ($gazeRow = $db->fetch($queryId)) != false ) {
        
        $gazeRowAsObject = snakeToCamel($gazeRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($gazeRowAsObject, true));

        $gazeEvent = new LogEvent($jobId, $fileId, $gazeRowAsObject);     
        $gazeEvent->gazeData($gazeRowAsObject);
        
        array_push($gazeEvents, $gazeEvent); 
    }
    if(!empty($gazeEvents))
    {
        //log::doLog("CASMACAT: gazeEvents: " . print_r($gazeEvents, true));
        $countGazes = 0;
        $lenGazes = count($gazeEvents);
        //print $lenGazes;
    }
    else $lenGazes = 0;
    
    //-------------------------------------------------------------------------------
    
    
    
    //itp_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", i.data"
        . " FROM log_event_header h, itp_event i WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = i.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $itpRow = null;
    $itpEvents = array();
    while ( ($itpRow = $db->fetch($queryId)) != false ) {
        
        $itpRowAsObject = snakeToCamel($itpRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($itpRowAsObject, true));

        $itpEvent = new LogEvent($jobId, $fileId, $itpRowAsObject);     
        $itpEvent->itpData($itpRowAsObject);
        
        array_push($itpEvents, $itpEvent); 
    }
    
    if(!empty($itpEvents))
    {
        //log::doLog("CASMACAT: itpEvents: " . print_r($itpEvents, true));
        $countItps = 0;
        $lenItps = count($itpEvents);
        //print $lenItps."\n";
    }
    else $lenItps = 0;
    
    //-------------------------------------------------------------------------------------------
    
    //key_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", k.cursor_position, k.which, k.mapped_key, k.shift, k.ctrl, k.alt"
        . " FROM log_event_header h, key_event k WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = k.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $keyRow = null;
    $keyEvents = array();
    while ( ($keyRow = $db->fetch($queryId)) != false ) {
        
        $keyRowAsObject = snakeToCamel($keyRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($keyRowAsObject, true));

        $keyEvent = new LogEvent($jobId, $fileId, $keyRowAsObject);     
        $keyEvent->keyData($keyRowAsObject);
        
        array_push($keyEvents, $keyEvent); 
    }
    if(!empty($keyEvents))
    {
        //log::doLog("CASMACAT: keyEvents: " . print_r($keyEvents, true));
        $count_keys = 0;
        $len_keys = count($keyEvents);
        //print $len_keys."\n";
    }
    else $len_keys = 0;
    
    //-------------------------------------------------------------------------------------------
    
    //mouse_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", m.which, m.x, m.y, m.shift, m.ctrl, m.alt, m.cursor_position"
        . " FROM log_event_header h, mouse_event m WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = m.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $mouseRow = null;
    $mouseEvents = array();
    while ( ($mouseRow = $db->fetch($queryId)) != false ) {
        
        $mouseRowAsObject = snakeToCamel($mouseRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($mouseRowAsObject, true));

        $mouseEvent = new LogEvent($jobId, $fileId, $mouseRowAsObject);     
        $mouseEvent->mouseData($mouseRowAsObject);
        
        array_push($mouseEvents, $mouseEvent); 
    }
    if(!empty($mouseEvents))
    {
        //log::doLog("CASMACAT: mouseEvents: " . print_r($mouseEvents, true));
        $count_mouses = 0;
        $len_mouses = count($mouseEvents);
        //print $len_mouses."\n";
    }
    else $len_mouses = 0;
    
    //-------------------------------------------------------------------------------------------
    
    //resize_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", r.width, r.height"
        . " FROM log_event_header h, resize_event r WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = r.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $resizeRow = null;
    $resizeEvents = array();
    while ( ($resizeRow = $db->fetch($queryId)) != false ) {
        
        $resizeRowAsObject = snakeToCamel($resizeRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($resizeRowAsObject, true));

        $resizeEvent = new LogEvent($jobId, $fileId, $resizeRowAsObject);     
        $resizeEvent->resizeData($resizeRowAsObject);
        
        array_push($resizeEvents, $resizeEvent); 
    }
    if(!empty($resizeEvents))
    {
        //log::doLog("CASMACAT: resizeEvents: " . print_r($resizeEvents, true));
        $count_resizes = 0;
        $len_resizes = count($resizeEvents);
        //print "len_resizes: ".$len_resizes."\n";
    }
    else $len_resizes = 0;
    
    //-------------------------------------------------------------------------------------------
    
    //scroll_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", s.offset"
        . " FROM log_event_header h, scroll_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $scrollRow = null;
    $scrollEvents = array();
    while ( ($scrollRow = $db->fetch($queryId)) != false ) {
        
        $scrollRowAsObject = snakeToCamel($scrollRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($scrollRowAsObject, true));

        $scrollEvent = new LogEvent($jobId, $fileId, $scrollRowAsObject);     
        $scrollEvent->scrollData($scrollRowAsObject);
        
        array_push($scrollEvents, $scrollEvent); 
    }
    
    if(!empty($scrollEvents))
    {
        //log::doLog("CASMACAT: scrollEvents: " . print_r($scrollEvents, true));
        $count_scrolls = 0;
        $len_scrolls = count($scrollEvents);
        //print "len_scrolls: ".$len_scrolls."\n";
    }
    else $len_scrolls = 0;
    
    //-------------------------------------------------------------------------------------------
    
    //selection_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", s.start_node_id, s.start_node_x_path, s.s_cursor_position, s.end_node_id, s.end_node_x_path, s.e_cursor_position, s.selected_text"
        . " FROM log_event_header h, selection_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $selectionRow = null;
    $selectionEvents = array();
    while ( ($selectionRow = $db->fetch($queryId)) != false ) {
        
        $selectionRowAsObject = snakeToCamel($selectionRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($selectionRowAsObject, true));

        $selectionEvent = new LogEvent($jobId, $fileId, $selectionRowAsObject);     
        $selectionEvent->selectionData($selectionRowAsObject);
        
        array_push($selectionEvents, $selectionEvent); 
    }
    if(!empty($selectionEvents))
    {
        //log::doLog("CASMACAT: selectionEvents: " . print_r($selectionEvents, true));
        $count_selections = 0;
        $len_selections = count($selectionEvents);
        //print "len_selections: ".$len_selections."\n";
    }
    else $len_selections = 0;
    
    
    
    //-------------------------------------------------------------------------------------------
    
    
    //sr_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", s.rules"
        . " FROM log_event_header h, sr_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $srRow = null;
    $srEvents = array();
    while ( ($srRow = $db->fetch($queryId)) != false ) {
        
        $srRowAsObject = snakeToCamel($srRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($srRowAsObject, true));

        $srEvent = new LogEvent($jobId, $fileId, $srRowAsObject);     
        $srEvent->srData($srRowAsObject);
        
        array_push($srEvents, $srEvent); 
    }
    
    if(!empty($srEvents))
    {
        //log::doLog("CASMACAT: srEvents: " . print_r($srEvents, true));
        $count_srs = 0;
        $len_srs = count($srEvents);
        //print "len_srs: ".$len_srs."\n";
    }
    else $len_srs = 0;
    
      
    
    
    //-------------------------------------------------------------------------------------------
    
    //stats_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", s.stats"
        . " FROM log_event_header h, stats_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $statsRow = null;
    $statsEvents = array();
    while ( ($statsRow = $db->fetch($queryId)) != false ) {
        
        $statsRowAsObject = snakeToCamel($statsRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($statsRowAsObject, true));

        $statsEvent = new LogEvent($jobId, $fileId, $statsRowAsObject);     
        $statsEvent->statsUpdatedData($statsRowAsObject);
        
        array_push($statsEvents, $statsEvent); 
    }
    
    if(!empty($statsEvents))
    {
        //log::doLog("CASMACAT: statsEvents: " . print_r($statsEvents, true));
        $count_statss = 0;
        $len_statss = count($statsEvents);
        //print "len_statss: ".$len_statss."\n";
        
    }
    else $len_statss = 0;
    
    
    
    //-------------------------------------------------------------------------------------------
    
    //suggestions_loaded_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", s.matches"
        . " FROM log_event_header h, suggestions_loaded_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $suggestions_loadedRow = null;
    $suggestions_loadedEvents = array();
    while ( ($suggestions_loadedRow = $db->fetch($queryId)) != false ) {
        
        $suggestions_loadedRowAsObject = snakeToCamel($suggestions_loadedRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($suggestions_loadedRowAsObject, true));

        $suggestions_loadedEvent = new LogEvent($jobId, $fileId, $suggestions_loadedRowAsObject);     
        $suggestions_loadedEvent->suggestionsLoadedData($suggestions_loadedRowAsObject);
        
        array_push($suggestions_loadedEvents, $suggestions_loadedEvent); 
    }
    
    if(!empty($suggestions_loadedEvents))
    {
        //log::doLog("CASMACAT: suggestions_loadedEvents: " . print_r($suggestions_loadedEvents, true));
        $count_suggestions_loadeds = 0;
        $len_suggestions_loadeds = count($suggestions_loadedEvents);
        //print "len_suggestions_loadeds: ".$len_suggestions_loadeds."\n";
    }
    else $len_suggestions_loadeds = 0;
    
    
    
    //-------------------------------------------------------------------------------------------
    
    //suggestion_chosen_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", s.which, s.translation"
        . " FROM log_event_header h, suggestion_chosen_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $suggestion_chosenRow = null;
    $suggestions_chosenEvents = array();
    while ( ($suggestion_chosenRow = $db->fetch($queryId)) != false ) {
        
        $suggestion_chosenRowAsObject = snakeToCamel($suggestion_chosenRow);        
        log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($suggestion_chosenRowAsObject, true));

        $suggestion_chosenEvent = new LogEvent($jobId, $fileId, $suggestion_chosenRowAsObject);     
        $suggestion_chosenEvent->suggestionChosenData($suggestion_chosenRowAsObject);
        
        array_push($suggestion_chosenEvents, $suggestion_chosenEvent); 
    }
    if(!empty($suggestions_chosenEvents))
    {
    
    	//log::doLog("CASMACAT: suggestion_chosenEvents: " . print_r($suggestion_chosenEvents, true));
    	$count_suggestion_chosens = 0;
    	$len_suggestion_chosens = count($suggestion_chosenEvents);
    	//print "len_suggestion_chosens: ".$len_suggestion_chosens."\n";
    }
    else $len_suggestion_chosens = 0;
    
    
    
    //-------------------------------------------------------------------------------------------
    
    //text_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", t.cursor_position, t.deleted, t.inserted"
        . " FROM log_event_header h, text_event t WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = t.header_id ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));

    }
        
    $textRow = null;
    $textEvents = array();
    while ( ($textRow = $db->fetch($queryId)) != false ) {
        
        $textRowAsObject = snakeToCamel($textRow);        
        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($textRowAsObject, true));

        $textEvent = new LogEvent($jobId, $fileId, $textRowAsObject);     
        $textEvent->textData($textRowAsObject);
        
        array_push($textEvents, $textEvent); 
    }
    
    if(!empty($textEvents))
    {
        //log::doLog("CASMACAT: textEvents: " . print_r($textEvents, true));
        $count_texts = 0;
        $len_texts = count($textEvents);
        //print "len_texts: ".$len_texts."\n";
    }
    else $len_texts = 0;
        
    
        
    //-------------------------------------------------------------------------------------------
        
    //log_event_header
    $queryId = $db->query("SELECT * FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'"
            . " ORDER BY h.time, h.id ASC");
    
    
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
    }
      
    $headerRow = null;  
    
    while ( ($headerRow = $db->fetch($queryId)) != false ) {
        $found = false;
        $headerRowAsObject = snakeToCamel($headerRow);
        $logEvent = new LogEvent($jobId, $fileId, $headerRowAsObject);
        
        $writer->startElement($logEvent->type);
            
	//log::doLog("CASMACAT: Row config: " . print_r($configEvents[0],true));   
    
        if ($len_config != 0 && $headerRowAsObject->id == $configEvents[$count_config]->id){
            //print $count_config."\n";
            //log::doLog("CASMACAT: Row config: " . print_r($configEvents[$count_config],true));   
            
            foreach($configEvents[$count_config] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_config < $len_config-1){
                $count_config = $count_config + 1;
                
            }
        }
        elseif ($lenDeletes != 0 && $headerRowAsObject->id == $deleteEvents[$countDeletes]->id ){
            //print $countDeletes."\n";
            //log::doLog("CASMACAT: Row delete: " . print_r($deleteEvents[$countDeletes],true));   
            
            foreach($deleteEvents[$countDeletes] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($countDeletes < $lenDeletes-1){
                $countDeletes = $countDeletes + 1;
                
            }
        }
        
        elseif ($lenFixations != 0 && $headerRowAsObject->id == $fixationEvents[$countFixations]->id){
            //log::doLog("CASMACAT: Row fixation: " . print_r($fixationEvents[$countFixations],true));   
            
            foreach($fixationEvents[$countFixations] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($countFixations < $lenFixations-1){
                $countFixations = $countFixations + 1;
                //print "Fixation: ".$countFixations."\n";
            }
        }
        
        elseif ($lenGazes != 0 && $headerRowAsObject->id == $gazeEvents[$countGazes]->id){
            
            //log::doLog("CASMACAT: Row gaze: " . print_r($gazeEvents[$countGazes],true));   
            
            foreach($gazeEvents[$countGazes] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($countGazes < $lenGazes-1){
                $countGazes = $countGazes + 1;
                
            }
        }
        
        elseif ($lenItps != 0 && $headerRowAsObject->id == $itpEvents[$countItps]->id){
            
            //log::doLog("CASMACAT: Row itp: " . print_r($itpEvents[$countItps],true));   
            
            foreach($itpEvents[$countItps] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($countItps < $lenItps-1){
                $countItps = $countItps + 1;
                
            }
        }
        
        elseif ($len_keys != 0 && $headerRowAsObject->id == $keyEvents[$count_keys]->id){
            
            //log::doLog("CASMACAT: Row key: " . print_r($keyEvents[$count_keys],true));   
            
            foreach($keyEvents[$count_keys] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_keys < $len_keys-1){
                $count_keys = $count_keys + 1;
                
            }
        }
        
        elseif ($len_mouses != 0 && $headerRowAsObject->id == $mouseEvents[$count_mouses]->id){
            
            //log::doLog("CASMACAT: Row mouse: " . print_r($mouseEvents[$count_mouses],true));   
            
            foreach($mouseEvents[$count_mouses] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_mouses < $len_mouses-1){
                $count_mouses = $count_mouses + 1;
                
            }
        }
        
        elseif ($len_resizes != 0 && $headerRowAsObject->id == $resizeEvents[$count_resizes]->id){
            
            //log::doLog("CASMACAT: Row resize: " . print_r($resizeEvents[$count_resizes],true));   
            
            foreach($resizeEvents[$count_resizes] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_resizes < $len_resizes-1){
                $count_resizes = $count_resizes + 1;
                
            }
        }
        
        elseif ($len_scrolls != 0 && $headerRowAsObject->id == $scrollEvents[$count_scrolls]->id){
            
            //log::doLog("CASMACAT: Row scroll: " . print_r($scrollEvents[$count_scrolls],true));   
            
            foreach($scrollEvents[$count_scrolls] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_scrolls < $len_scrolls-1){
                $count_scrolls = $count_scrolls + 1;
                
            }
        }
        
        elseif ($len_selections != 0 && $headerRowAsObject->id == $selectionEvents[$count_selections]->id){
            
            //log::doLog("CASMACAT: Row selection: " . print_r($selectionEvents[$count_selections],true));   
            
            foreach($selectionEvents[$count_selections] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_selections < $len_selections-1){
                $count_selections = $count_selections + 1;
                
            }
        }
        
        elseif ($len_srs != 0 && $headerRowAsObject->id == $srEvents[$count_srs]->id){
            
            //log::doLog("CASMACAT: Row sr: " . print_r($srEvents[$count_srs],true));   
            
            foreach($srEvents[$count_srs] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_srs < $len_srs-1){
                $count_srs = $count_srs + 1;
                
            }
        }
        
        elseif ($len_statss != 0 && $headerRowAsObject->id == $statsEvents[$count_statss]->id){
            
            //log::doLog("CASMACAT: Row stats: " . print_r($statsEvents[$count_statss],true));   
            
            foreach($statsEvents[$count_statss] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_statss < $len_statss-1){
                $count_statss = $count_statss + 1;
                
            }
        }
        
        elseif ($len_suggestions_loadeds != 0 && $headerRowAsObject->id == $suggestions_loadedEvents[$count_suggestions_loadeds]->id){
            
            //log::doLog("CASMACAT: Row suggestions_loaded: " . print_r($suggestions_loadedEvents[$count_suggestions_loadeds],true));   
            
            foreach($suggestions_loadedEvents[$count_suggestions_loadeds] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_suggestions_loadeds < $len_suggestions_loadeds-1){
                $count_suggestions_loadeds = $count_suggestions_loadeds + 1;
                
            }
        }
        
        elseif ($len_suggestion_chosens != 0 && $headerRowAsObject->id == $suggestion_chosenEvents[$count_suggestion_chosens]->id){
            
            //log::doLog("CASMACAT: Row suggestion_chosen: " . print_r($suggestion_chosenEvents[$count_suggestion_chosens],true));   
            
            foreach($suggestion_chosenEvents[$count_suggestion_chosens] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_suggestion_chosens < $len_suggestion_chosens-1){
                $count_suggestion_chosens = $count_suggestion_chosens + 1;
                
            }
        }
        
        elseif ($len_texts != 0 && $headerRowAsObject->id == $textEvents[$count_texts]->id){
            
            //log::doLog("CASMACAT: Row text: " . print_r($textEvents[$count_texts],true));   
            
            foreach($textEvents[$count_texts] as $attribute => $val){                
                
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            }
            if ($count_texts < $len_texts-1){
                $count_texts = $count_texts + 1;
                
            }
        }
        else
        {   

        
            //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($headerRowAsObject, true));
            //log::doLog("CASMACAT: Next headerRow id: " . $headerRowAsObject->id);
            //log::doLog("CASMACAT: First row fixation: " . $fixationEvents[0]->id);
        
            //log::doLog("CASMACAT: fetchLogChunk(): Processing header id: '$logEvent->id'");
        
            foreach($logEvent as $attribute => $val){                
                //print $attribute;
                if ($attribute != 'jobId' && $attribute != 'fileId' && $attribute != 'type'){
                    $writer->writeAttribute($attribute, $val);
                }
            } 
        
        }
        $writer->endElement();
        
        
        
        
    }
    

        
    $writer->endElement();

 
        
//        log::doLog("CASMACAT: fetchLogChunk(): Loaded: '" . $logEvent->toString() . "'");
    
 
    $writer->endElement();           
    $writer->endDocument(); 
    $writer->flush();  
	
    $db->close();
    
    $endTime = Tools::getCurrentMillis();
    //print "Finish: ".$endTime."\n";
    $totalTime = $endTime - $startTime;
    //print "Total time: ".$totalTime."\n";
    
    ini_set('memory_limit', '128M');
  
//}
?>
