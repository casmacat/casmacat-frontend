<?php


if ($argc < 3) {
    print("Usage: checkLogging.php <fileId> <jobId>");
}
else {
    if ($argc == 3) {
        require_once '../../inc/config.inc.php';
    }
    
    if ($argc == 4) {
        require_once 'inc/config.inc.php';
    }
    
    $fileId = $argv[1];
    $jobId = $argv[2]; 
        
    INIT::obtain();

    require_once INIT::$UTILS_ROOT.'/log.class.php';
    require_once INIT::$MODEL_ROOT.'/Database.class.php';  

    include_once INIT::$MODEL_ROOT . "/casQueries.php";
    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
    //include_once INIT::$UTILS_ROOT . "/Tools.class.php";
        
    ini_set('memory_limit', '8000M');
    
    //$startTime = Tools::getCurrentMillis();
    //print "Start: ".$startTime."\n";
	
    
    $db = Database::obtain(INIT::$DB_SERVER, INIT::$DB_USER, INIT::$DB_PASS, INIT::$DB_DATABASE);
    $db->connect();	
    
    //filename and source lang
    $queryId = $db->query("SELECT filename, source_language FROM files f WHERE f.id = ".$fileId);
    
    $err = $db->get_error();
    //log::doLog("CASMACAT: err(): " .print_r($err,true));
    $errno = $err["error_code"];
    if ($errno != 0) {
         log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        return $errno * -1;
    }
    $row = $db->fetch($queryId);
    
    $src_lang = $row["source_language"];
    $to_print = "";
    $to_print = $to_print. "File name: ".$row["filename"]."\n";
    $filename ="checkLogging_FileID".$fileId."_JobID".$jobId.".txt";
    if (!file_exists(INIT::$LOG_DOWNLOAD) || !is_dir(INIT::$LOG_DOWNLOAD)) {
        mkdir(INIT::$LOG_DOWNLOAD);
    }
    $file = INIT::$LOG_DOWNLOAD . "/" . $filename;
    //$to_print = $to_print. "File: ".$file."\n";
    $fp = fopen($file, 'w');

	    
    
    
    //Check if it is ITP
    $itp = 0;
    $queryId = $db->query("SELECT element_id FROM `log_event_header` l, itp_event i WHERE l.type = 'decode' AND l.job_id = ".$jobId." AND l.file_id = ".$fileId." AND i.header_id = l.id LIMIT 1,1");
    while ( ($row = $db->fetch($queryId)) != false ) {
        $itp = 1;
        break;
    }
    
    //Check if it is Edinburgh ITP
    $edi = 0;
    $queryId = $db->query("SELECT element_id FROM `log_event_header` l WHERE l.type = 'floatPrediction' AND l.job_id = ".$jobId." AND l.file_id = ".$fileId." LIMIT 1,1");
    while ( ($row = $db->fetch($queryId)) != false ) {
        $edi = 1;
        break;
    }
    
	
    // target language
    $queryId = $db->query("SELECT target FROM `files_job` fj, `jobs` j WHERE j.id = fj.id_job AND fj.id_file = ".$fileId." AND fj.id_job = ".$jobId);
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        return $errno * -1;
    }
    $row = $db->fetch($queryId);    
    
    $to_print = $to_print. "fileId:".$fileId." jobId:".$jobId."\n";
    $to_print = $to_print. "Src_lang:".$src_lang." Trg_lang:".$row['target']."\n";

    if ($itp == 1){
        if ($edi == 0){
            $to_print = $to_print. "ITP_VLC\n";
        }
        else{
            $to_print = $to_print. "ITP_EDI\n";
        }
    }
    else{
        $to_print = $to_print. "NO ITP\n";
    }
    
	
    //Source text
    $queryId = $db->query("SELECT s.segment, s.id FROM `files_job` fj, `segments` s WHERE s.id_file = ".$fileId." AND fj.id_file = ".$fileId." AND fj.id_job = ".$jobId);
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
        return $errno * -1;
    }


    $logSegments = array();
    $row = null;
    $countSrc = 0;
    
    while ( ($row = $db->fetch($queryId)) != false ) {
        $countSrc = $countSrc + 1;; 
    //    print "id:".$row['id']." ".html_entity_decode($row['segment'], ENT_QUOTES, 'UTF-8')."\n";
    }
    $to_print = $to_print. "Source text: ".$countSrc." segments\n";

    //initial target

    $countIni = 0;    
    if ($itp == 1) {
        $queryId = $db->query("SELECT DISTINCT element_id, data FROM `log_event_header` l, itp_event i WHERE l.type = 'decode' AND l.job_id = ".$jobId." AND l.file_id = ".$fileId." AND i.header_id = l.id ORDER BY element_id");
        while ( ($row = $db->fetch($queryId)) != false ) {
            $json = $row["data"];
            $obj = json_decode($json);
            $nbest = $obj->{'nbest'};
            $inisuggestion = $nbest[0]->target;
            list($segment, $id, $editarea) = explode("-",$row['element_id']);
            $countIni = $countIni + 1;            
        }
        if ($countIni > 0) {
            $to_print = $to_print. "Initial suggestions: Yes\n";
        }
        else {
            $to_print = $to_print. "Initial suggestions: No\n";
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
             $countIni = $countIni + 1;  
        }            
        if ($countIni > 0) {
            $to_print = $to_print. "Initial suggestions: Yes\n";
        }
        else {
            $to_print = $to_print. "Initial suggestions: No\n";
        }
    }                 

    //target       
    $queryId = $db->query("SELECT id_segment, translation FROM `segment_translations` st, `files_job` fj WHERE st.id_job = fj.id_job AND fj.id_job = ".$jobId." AND fj.id_file = ".$fileId." ORDER BY id_segment");
    $err = $db->get_error();
    $errno = $err["error_code"];
    if ($errno != 0) {
		return $errno * -1;
    }        
    $logSegments = array();
    $row = null;
    $countTrans = 0;
    while ( ($row = $db->fetch($queryId)) != false ) {    
        $countTrans = $countTrans + 1;
    }      
    if ($countTrans > 0){
        $to_print = $to_print. "Final translations: ".$countTrans."\n"; 
    }
    else{
        $to_print = $to_print. "Final translations: No\n";
    }
    
 
//    -------------------------------------------------------------------------------------------------------------------------
    //events
        
    

    
     //-------------------------------------------------------------------------------
//    
//    //deleting_suggestion_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id as job_id, h.file_id as file_id, h.element_id as element_id, h.x_path as x_path, h.time as time, h.type as type, "
//            . "d.which"
//        . " FROM log_event_header h, deleting_suggestion_event d WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = d.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $deleteRow = null;
//    $deleteEvents = array();
//    while ( ($deleteRow = $db->fetch($queryId)) != false ) {
//        
//        $deleteRowAsObject = snakeToCamel($deleteRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($deleteRowAsObject, true));
//
//        $deleteEvent = new LogEvent($jobId, $fileId, $deleteRowAsObject);     
//        $deleteEvent->deletingSuggestionData($deleteRowAsObject);
//        
//        array_push($deleteEvents, $deleteEvent); 
//    }
//    if(!empty($deleteEvents))
//    {
//        //log::doLog("CASMACAT: deleteEvents: " . print_r($deleteEvents, true));
//        $countDeletes = 0;
//        $lenDeletes = count($deleteEvents);
//        //print $lenDeletes;
//    }
//    else $lenDeletes = 0;
//    
//   
//    
//    //-------------------------------------------------------------------------------
//    
//    
    //fixation_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id as job_id, h.file_id as file_id, h.element_id as element_id, h.x_path as x_path, h.time as time, h.type as type, "
            . "f.t_time as t_time, f.x as x, f.y as y, f.duration as duration, f.character, f.offset as offset, f.above_char as aboveChar, f.below_char as belowChar, f.above_offset as aboveOffset, f.below_offset as belowOffset, f.gold_offset as goldOffset"
        . " FROM log_event_header h, fixation_event f WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = f.header_id ORDER BY h.time, h.id ASC"); //dan: added f.above_char, f.below_char, f.above_offset, f.below_offset, f.gold_offset 
    
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
        $to_print = $to_print. "Fixations: ".$lenFixations."\n";
    }
    else {
        $lenFixations = 0;
        $to_print = $to_print. "Fixations: No\n";
    }
 
//    //-------------------------------------------------------------------------------
//    
//    
//    
//    //gaze_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", g.t_time, g.lx, g.ly, g.rx, g.ry, g.l_dil, g.r_dil, g.l_dil, g.l_char, g.l_offset, g.r_char, g.r_offset"
//        . " FROM log_event_header h, gaze_event g WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = g.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $gazeRow = null;
//    $gazeEvents = array();
//    while ( ($gazeRow = $db->fetch($queryId)) != false ) {
//        
//        $gazeRowAsObject = snakeToCamel($gazeRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($gazeRowAsObject, true));
//
//        $gazeEvent = new LogEvent($jobId, $fileId, $gazeRowAsObject);     
//        $gazeEvent->gazeData($gazeRowAsObject);
//        
//        array_push($gazeEvents, $gazeEvent); 
//    }
//    if(!empty($gazeEvents))
//    {
//        //log::doLog("CASMACAT: gazeEvents: " . print_r($gazeEvents, true));
//        $countGazes = 0;
//        $lenGazes = count($gazeEvents);
//        //print $lenGazes;
//    }
//    else $lenGazes = 0;
//    
//    //-------------------------------------------------------------------------------
//    
//    
//    
//    //itp_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", i.data"
//        . " FROM log_event_header h, itp_event i WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = i.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $itpRow = null;
//    $itpEvents = array();
//    while ( ($itpRow = $db->fetch($queryId)) != false ) {
//        
//        $itpRowAsObject = snakeToCamel($itpRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($itpRowAsObject, true));
//
//        $itpEvent = new LogEvent($jobId, $fileId, $itpRowAsObject);     
//        $itpEvent->itpData($itpRowAsObject);
//        
//        array_push($itpEvents, $itpEvent); 
//    }
//    
//    if(!empty($itpEvents))
//    {
//        //log::doLog("CASMACAT: itpEvents: " . print_r($itpEvents, true));
//        $countItps = 0;
//        $lenItps = count($itpEvents);
//        //print $lenItps."\n";
//    }
//    else $lenItps = 0;
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //key_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", k.cursor_position, k.which, k.mapped_key, k.shift, k.ctrl, k.alt"
//        . " FROM log_event_header h, key_event k WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = k.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $keyRow = null;
//    $keyEvents = array();
//    while ( ($keyRow = $db->fetch($queryId)) != false ) {
//        
//        $keyRowAsObject = snakeToCamel($keyRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($keyRowAsObject, true));
//
//        $keyEvent = new LogEvent($jobId, $fileId, $keyRowAsObject);     
//        $keyEvent->keyData($keyRowAsObject);
//        
//        array_push($keyEvents, $keyEvent); 
//    }
//    if(!empty($keyEvents))
//    {
//        //log::doLog("CASMACAT: keyEvents: " . print_r($keyEvents, true));
//        $count_keys = 0;
//        $len_keys = count($keyEvents);
//        //print $len_keys."\n";
//    }
//    else $len_keys = 0;
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //mouse_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", m.which, m.x, m.y, m.shift, m.ctrl, m.alt, m.cursor_position"
//        . " FROM log_event_header h, mouse_event m WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = m.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $mouseRow = null;
//    $mouseEvents = array();
//    while ( ($mouseRow = $db->fetch($queryId)) != false ) {
//        
//        $mouseRowAsObject = snakeToCamel($mouseRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($mouseRowAsObject, true));
//
//        $mouseEvent = new LogEvent($jobId, $fileId, $mouseRowAsObject);     
//        $mouseEvent->mouseData($mouseRowAsObject);
//        
//        array_push($mouseEvents, $mouseEvent); 
//    }
//    if(!empty($mouseEvents))
//    {
//        //log::doLog("CASMACAT: mouseEvents: " . print_r($mouseEvents, true));
//        $count_mouses = 0;
//        $len_mouses = count($mouseEvents);
//        //print $len_mouses."\n";
//    }
//    else $len_mouses = 0;
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //resize_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", r.width, r.height"
//        . " FROM log_event_header h, resize_event r WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = r.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $resizeRow = null;
//    $resizeEvents = array();
//    while ( ($resizeRow = $db->fetch($queryId)) != false ) {
//        
//        $resizeRowAsObject = snakeToCamel($resizeRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($resizeRowAsObject, true));
//
//        $resizeEvent = new LogEvent($jobId, $fileId, $resizeRowAsObject);     
//        $resizeEvent->resizeData($resizeRowAsObject);
//        
//        array_push($resizeEvents, $resizeEvent); 
//    }
//    if(!empty($resizeEvents))
//    {
//        //log::doLog("CASMACAT: resizeEvents: " . print_r($resizeEvents, true));
//        $count_resizes = 0;
//        $len_resizes = count($resizeEvents);
//        //print "len_resizes: ".$len_resizes."\n";
//    }
//    else $len_resizes = 0;
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //scroll_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", s.offset"
//        . " FROM log_event_header h, scroll_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $scrollRow = null;
//    $scrollEvents = array();
//    while ( ($scrollRow = $db->fetch($queryId)) != false ) {
//        
//        $scrollRowAsObject = snakeToCamel($scrollRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($scrollRowAsObject, true));
//
//        $scrollEvent = new LogEvent($jobId, $fileId, $scrollRowAsObject);     
//        $scrollEvent->scrollData($scrollRowAsObject);
//        
//        array_push($scrollEvents, $scrollEvent); 
//    }
//    
//    if(!empty($scrollEvents))
//    {
//        //log::doLog("CASMACAT: scrollEvents: " . print_r($scrollEvents, true));
//        $count_scrolls = 0;
//        $len_scrolls = count($scrollEvents);
//        //print "len_scrolls: ".$len_scrolls."\n";
//    }
//    else $len_scrolls = 0;
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //selection_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", s.start_node_id, s.start_node_x_path, s.s_cursor_position, s.end_node_id, s.end_node_x_path, s.e_cursor_position, s.selected_text"
//        . " FROM log_event_header h, selection_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $selectionRow = null;
//    $selectionEvents = array();
//    while ( ($selectionRow = $db->fetch($queryId)) != false ) {
//        
//        $selectionRowAsObject = snakeToCamel($selectionRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($selectionRowAsObject, true));
//
//        $selectionEvent = new LogEvent($jobId, $fileId, $selectionRowAsObject);     
//        $selectionEvent->selectionData($selectionRowAsObject);
//        
//        array_push($selectionEvents, $selectionEvent); 
//    }
//    if(!empty($selectionEvents))
//    {
//        //log::doLog("CASMACAT: selectionEvents: " . print_r($selectionEvents, true));
//        $count_selections = 0;
//        $len_selections = count($selectionEvents);
//        //print "len_selections: ".$len_selections."\n";
//    }
//    else $len_selections = 0;
//    
//    
//    
//    //-------------------------------------------------------------------------------------------
        
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
        $srEvent->srRulesSetData($srRowAsObject);        
        array_push($srEvents, $srEvent); 
    }    
    if(!empty($srEvents))
    {
        //log::doLog("CASMACAT: srEvents: " . print_r($srEvents, true));
        $count_srs = 0;
        $len_srs = count($srEvents);
        $to_print = $to_print. "Search and replace events: ".$len_srs."\n";
    }
    else {
        $len_srs = 0;
        $to_print = $to_print. "Search and replace events: No\n";
    }
  
    
//    //-------------------------------------------------------------------------------------------
//    
//    //stats_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", s.stats"
//        . " FROM log_event_header h, stats_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $statsRow = null;
//    $statsEvents = array();
//    while ( ($statsRow = $db->fetch($queryId)) != false ) {
//        
//        $statsRowAsObject = snakeToCamel($statsRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($statsRowAsObject, true));
//
//        $statsEvent = new LogEvent($jobId, $fileId, $statsRowAsObject);     
//        $statsEvent->statsUpdatedData($statsRowAsObject);
//        
//        array_push($statsEvents, $statsEvent); 
//    }
//    
//    if(!empty($statsEvents))
//    {
//        //log::doLog("CASMACAT: statsEvents: " . print_r($statsEvents, true));
//        $count_statss = 0;
//        $len_statss = count($statsEvents);
//        //print "len_statss: ".$len_statss."\n";
//        
//    }
//    else $len_statss = 0;
//    
//    
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //suggestions_loaded_event 
//    
//    
//    
//    
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", s.matches"
//        . " FROM log_event_header h, suggestions_loaded_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $suggestions_loadedRow = null;
//    $suggestions_loadedEvents = array();
//    while ( ($suggestions_loadedRow = $db->fetch($queryId)) != false ) {
//        
//        $suggestions_loadedRowAsObject = snakeToCamel($suggestions_loadedRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($suggestions_loadedRowAsObject, true));
//
//        $suggestions_loadedEvent = new LogEvent($jobId, $fileId, $suggestions_loadedRowAsObject);     
//        $suggestions_loadedEvent->suggestionsLoadedData($suggestions_loadedRowAsObject);
//        
//        array_push($suggestions_loadedEvents, $suggestions_loadedEvent); 
//    }
//    
//    if(!empty($suggestions_loadedEvents))
//    {
//        //log::doLog("CASMACAT: suggestions_loadedEvents: " . print_r($suggestions_loadedEvents, true));
//        $count_suggestions_loadeds = 0;
//        $len_suggestions_loadeds = count($suggestions_loadedEvents);
//        //print "len_suggestions_loadeds: ".$len_suggestions_loadeds."\n";
//    }
//    else $len_suggestions_loadeds = 0;
//    
//    
//    
//    //-------------------------------------------------------------------------------------------
//    
//    //suggestion_chosen_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", s.which, s.translation"
//        . " FROM log_event_header h, suggestion_chosen_event s WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = s.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $suggestion_chosenRow = null;
//    $suggestion_chosenEvents = array();
//    
//    while ( ($suggestion_chosenRow = $db->fetch($queryId)) != false ) {
//        
//        $suggestion_chosenRowAsObject = snakeToCamel($suggestion_chosenRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($suggestion_chosenRowAsObject, true));
//
//        $suggestion_chosenEvent = new LogEvent($jobId, $fileId, $suggestion_chosenRowAsObject);     
//        $suggestion_chosenEvent->suggestionChosenData($suggestion_chosenRowAsObject);
//        
//        array_push($suggestion_chosenEvents, $suggestion_chosenEvent); 
//    }
//    if(!empty($suggestion_chosenEvents))
//    {
//    
//    	//log::doLog("CASMACAT: suggestion_chosenEvents: " . print_r($suggestion_chosenEvents, true));
//    	$count_suggestion_chosens = 0;
//    	$len_suggestion_chosens = count($suggestion_chosenEvents);
//    	//print "len_suggestion_chosens: ".$len_suggestion_chosens."\n";
//    }
//    else $len_suggestion_chosens = 0;
//    
//    
//    
//    //-------------------------------------------------------------------------------------------
//    
    //text_event 
    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
            . ", t.cursor_position, t.deleted, t.inserted, t.previous, t.text, t.edition"
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
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($textRowAsObject, true));

        $textEvent = new LogEvent($jobId, $fileId, $textRowAsObject);     
        $textEvent->textData($textRowAsObject);        
        array_push($textEvents, $textEvent); 
    }
    
    if(!empty($textEvents))
    {
        //log::doLog("CASMACAT: textEvents: " . print_r($textEvents, true));
        $count_texts = 0;
        $len_texts = count($textEvents);
        $to_print = $to_print. "Text events: ".$len_texts."\n";
    }
    else {
        $len_texts = 0;
        $to_print = $to_print. "Text events: No\n";
    }
    
//    //-------------------------------------------------------------------------------------------
//    
    //biconcor_event 
//    $queryId = $db->query("SELECT h.id as id, h.job_id, h.file_id, h.element_id, h.x_path, h.time, h.type"
//            . ", b.word, b.info"
//        . " FROM log_event_header h, biconcor_event b WHERE h.job_id = '$jobId' AND h.file_id = '$fileId' AND h.id = b.header_id ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//
//    }
//        
//    $biconcorRow = null;
//    $biconcorEvents = array();
//    while ( ($biconcorRow = $db->fetch($queryId)) != false ) {
//        
//        $biconcorRowAsObject = snakeToCamel($biconcorRow);        
//        //log::doLog("CASMACAT: fetchLogChunk(): Next headerRow: " . print_r($textRowAsObject, true));
//
//        $biconcorEvent = new LogEvent($jobId, $fileId, $biconcorRowAsObject);     
//        $biconcorEvent->biconcorData($biconcorRowAsObject);
//        
//        array_push($biconcorEvents, $biconcorEvent); 
//    }
//    
//    if(!empty($biconcorEvents))
//    {
//        //log::doLog("CASMACAT: textEvents: " . print_r($textEvents, true));
//        $count_biconcors = 0;
//        $len_biconcors = count($biconcorEvents);
//        //print "len_texts: ".$len_texts."\n";
//    }
//    else $len_biconcors = 0;
//        
//    
//        
//    //-------------------------------------------------------------------------------------------
//        
//    //log_event_header
//    $queryId = $db->query("SELECT * FROM log_event_header h WHERE h.job_id = '$jobId' AND h.file_id = '$fileId'"
//            . " ORDER BY h.time, h.id ASC");
//    
//    
//    $err = $db->get_error();
//    $errno = $err["error_code"];
//    if ($errno != 0) {
//        log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//        throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
//    }
    
    //------------------------------------------------------------------------------------------------
 
     //config_event 
    $to_print = $to_print. "Configuration:\n";
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
        
        $configs = explode(",", $configEvent->config);
        foreach ($configs as $c) {
            $to_print = $to_print. "$c\n";
        }
        //$to_print = $to_print. $configEvent->config."\n";
        array_push($configEvents, $configEvent); 
    }
    
    if(!empty($configEvents))
    {
        //log::doLog("CASMACAT: configEvents: " . print_r($configEvents, true));
        $count_config = 0;
        $len_config = count($configEvents);
        //print "configEvents: " . print_r($configEvents->config, true);
    }
    else {
        $len_config = 0;
        $to_print = $to_print. "Conf events: No\n";
    }
    
    //-------------------------------------------------------------------------
    
  
//    ini_set('memory_limit', '128M');
    fwrite($fp, $to_print);
    fclose($fp);
    print $to_print;
    print "END";
    return 0;
  
}
?>
