<?php
require_once '../../inc/config.inc.php';
require_once INIT::$UTILS_ROOT.'/log.class.php';
require_once INIT::$MODEL_ROOT.'/Database.class.php';  

include_once INIT::$MODEL_ROOT . "/casQueries.php";
include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
include_once INIT::$MODEL_ROOT . "/queries.php";
include_once INIT::$UTILS_ROOT . "/Tools.class.php";
if($_FILES) {
    
    if (strpos($fileName = $_FILES['file']['name'], '.xml') !== FALSE) {
        if (!file_exists(INIT::$UPLOAD_ROOT) || !is_dir(INIT::$UPLOAD_ROOT)) {
            mkdir(INIT::$UPLOAD_ROOT);
            }
        $target_path = INIT::$UPLOAD_ROOT . "/" . $fileName;
        $tempName = $_FILES['file']['tmp_name'];
    
        if(!is_uploaded_file($tempName) || !move_uploaded_file($tempName, $target_path)){
            log::doLog( "FAILED TO UPLOAD " . $_FILES['file']['name'] . "Temporary Name: $tempName");
        } 
        
        $db = Database::obtain(INIT::$DB_SERVER, INIT::$DB_USER, INIT::$DB_PASS, INIT::$DB_DATABASE);
        $db->connect();	
    
        $queryId = $db->query("SELECT id_file, id_job FROM files_job ORDER BY id_file DESC LIMIT 1");
        $row = $db->fetch($queryId);
        $jobID = intval($row['id_file']) + 1;
        $fileID = intval($row['id_job']) + 1;
        $xml = simplexml_load_file($fileName);
        //project job
        $pid = insertProject('translated_user', $xml->documentName);
	//create job
	$password = $this->create_password();
        $jid = insertJob($password, $pid, '', $xml->Languages->attributes()->source, $xml->Languages->attributes()->target, '','');
        $fid = insertFile($pid, $_FILES['file']['name'], $xml->Languages->attributes()->source, 'xml', '');
	insertFilesJob($jid, $fid);
        for($i = 0; $i < count($xml->finalTargetText->children()); $i++ ) {
            $id = $xml->sourceText->element[i]->attributes()->id;
            $suggestion = NULL;
            if($xml->initialTargetText->element[i]){
                $suggestion = $xml->initialTargetText->element[i];               
            }
            $db->query("INSERT INTO `SEGMENT_TRANSLATIONS`  (`id_segment`,  `id_job`,   `translation`,  `translation_date`, `time_to_edit`, `match_type`,   `context_hash`, `eq_word_count`,    `suggestions_array`,    `suggestion`,   `suggestion_match`, `suggestion_source`,    `suggestion_postion`) 
                                                VALUES      ($id,           $jobID,     'TRANSLATED',   NOW(),              '',             '',             NULL,           NULL,               NULL,                   $suggestion,    NULL,               NULL,                   NULL)");
        }
        foreach($xml->events->fixation as $name => $event){
             $event->jobId = $fileID ;
             $event->fileId = $jobID;
            switch($name){
                    case LogEvent::GAZE:
                        insertGazeEvent($event);
                        break;
                    case LogEvent::FIXATION:
                        insertFixationEvent($event);
                        break;
                    case LogEvent::RESIZE:
                        insertResizeEvent($event);
                        break;
                    case LogEvent::TEXT:
                        insertTextEvent($event);
                        break;
                    case LogEvent::SELECTION:
                        insertSelectionEvent($event);
                        break;
                    case LogEvent::SCROLL:
                        insertScrollEvent($event);
                        break;
                    case LogEvent::SUGGESTIONS_LOADED:
                        insertSuggestionsLoadedEvent($event);
                        break;
                    case LogEvent::SUGGESTION_CHOSEN:
                        insertSuggestionChosenEvent($event);
                        break;
                    case LogEvent::DELETING_SUGGESTION:;
                        insertDeletingSuggestionEvent($event);
                        break;
                    case LogEvent::SUGGESTION_DELETED:
                        inserteventHeader($event);
                        break;
                    case LogEvent::STATS_UPDATED:
                        insertStatsUpdatedEvent($event);
                        break;
                    case LogEvent::DECODE:
                    case LogEvent::ALIGNMENTS:
                    case LogEvent::SUFFIX_CHANGE:
                    case LogEvent::CONFIDENCES:
                    case LogEvent::TOKENS:
                    case LogEvent::SHOW_ALIGNMENT_BY_KEY:
                    case LogEvent::HIDE_ALIGNMENT_BY_KEY:
                        insertItpEvent($event);
                        break;
                    case LogEvent::KEY_DOWN:
                    case LogEvent::KEY_UP:
                        insertKeyEvent($event);
                        break;
                    case LogEvent::MOUSE_DOWN:
                    case LogEvent::MOUSE_UP:
                    case LogEvent::MOUSE_CLICK:
                    case LogEvent::MOUSE_MOVE:
                        insertMouseEvent($event);
                        break;
                    case LogEvent::INITIAL_CONFIG:
                    case LogEvent::CONFIG_CHANGED:
                        insertConfigEvent($event);
                        break;
                    case LogEvent::SR_RULES_SET:
                        insertSrEvent($event);
                        break;
                    case LogEvent::BICONCOR:
                        insertBiconcorEvent($event);
                        break;
                    case LogEvent::DRAFTED:
                    case LogEvent::TRANSLATED:
                    case LogEvent::APPROVED:
                    case LogEvent::REJECTED:
                    case LogEvent::START_SESSION:
                    case LogEvent::STOP_SESSION:
                    case LogEvent::VIEWPORT_TO_SEGMENT:
                    case LogEvent::SOURCE_COPIED:
                    case LogEvent::SEGMENT_OPENED:
                    case LogEvent::SEGMENT_CLOSED:
                    case LogEvent::LOADING_SUGGESTIONS:
                    case LogEvent::SHOW_ALIGNMENT_BY_MOUSE:
                    case LogEvent::HIDE_ALIGNMENT_BY_MOUSE:
                    case LogEvent::BEFORE_CUT:
                    case LogEvent::BEFORE_COPY:
                    case LogEvent::BEFORE_PASTE:
                    case LogEvent::VIS_MENU_DISPLAYED:
                    case LogEvent::VIS_MENU_HIDDEN:
                    case LogEvent::MOUSE_WHEEL_DOWN:
                    case LogEvent::MOUSE_WHEEL_UP:
                    case LogEvent::MOUSE_WHEEL_INVALIDATE:
                    case LogEvent::MEMENTO_UNDO:
                    case LogEvent::MEMENTO_REDO:
                    case LogEvent::MEMENTO_INVALIDATE:
                    case LogEvent::SR_MENU_DISPLAYED:
                    case LogEvent::SR_MENU_HIDDEN:
                    case LogEvent::SR_MATCH_CASE_ON:
                    case LogEvent::SR_MATCH_CASE_OFF:
                    case LogEvent::SR_REG_EXP_ON:
                    case LogEvent::SR_REG_EXP_OFF:
                    case LogEvent::SR_RULES_SETTING:
                    case LogEvent::SR_RULES_APPLIED:
                    case LogEvent::SR_RULE_DELETED:
                    case LogEvent::FLOAT_PREDICTION:
                    case LogEvent::BICONCOR_CLOSED:
                    case LogEvent::TRANSLATION_OPTION:
                    case LogEvent::EPEN_OPENED:
                    case LogEvent::EPEN_CLOSED:
                    case LogEvent::BLUR:
                    case LogEvent::FOCUS:
                        inserteventHeader($event);
                        break;
            }
        }
                //log::doLog("POST: ".print_r($xml, true));
        } else    {
                echo "Invalid file type";      
        }  
}   
?>

