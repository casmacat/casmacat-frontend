<?php

if ($argc < 2) {
    print("Usage: uploadXML.php <file_name>");
}
else {

    $fileName = $argv[1];
    
    require_once '../../inc/config.inc.php';
    
    INIT::obtain();

    require_once INIT::$UTILS_ROOT.'/log.class.php';
    require_once INIT::$MODEL_ROOT.'/Database.class.php';
    
    include_once INIT::$MODEL_ROOT . "/casQueries.php";
    include_once INIT::$MODEL_ROOT . "/LogEvent.class.php";
    include_once INIT::$MODEL_ROOT . "/queries.php";
    #include_once INIT::$UTILS_ROOT . "/cat.class.php";
    include_once INIT::$UTILS_ROOT . "/Tools.class.php";

    #include_once INIT::$ROOT."\lib\utils\segmentExtractor.php";
    
    $file = INIT::$UPLOAD_ROOT . "/" . $fileName;
    print "file: ". $file."\n";

    $db = Database::obtain(INIT::$DB_SERVER, INIT::$DB_USER, INIT::$DB_PASS, INIT::$DB_DATABASE);
    $db->connect();	
    
    $handle = fopen($file, "r");
    $file2 = INIT::$UPLOAD_ROOT . "/com" . $fileName;
    $handle2 = fopen($file2, "w");
    
    if ($handle) {
        while (($line = fgets($handle)) !== false) {
        // process the line read.
            //print substr( $line, 0, 9 );
            if (substr( $line, 0, 9 ) === "  <ILtext" || substr( $line, 0, 10 ) === "  <ILfocus"){
                fwrite($handle2, "<!--".$line."-->\n");
            }
            else{
                fwrite($handle2, $line);
            }
        }
    } else {
        print "error opening the file";
        // error opening the file.
    }    
    fclose($handle);
    
    $xml = simplexml_load_file($file2);
    
    //print $fileName."\n";
    //print "documentName: ".$xml->documentName."\n";
    $src_lang = $xml->Languages->attributes()->source;
    print "src_language: ".$src_lang."\n";
  
    //create project
    $pid = insertProject('translated_user', "uploadFile");
    print "project: ".$pid."\n";
       
    //create pass
    $length=8;
    // Random
    $pool = "abcdefghkmnpqrstuvwxyz23456789"; // skipping iljo01 because not easy to distinguish
    $pool_lenght = strlen($pool);
    	
    $pwd = "";
    for($index = 0; $index < $length; $index++) {
        $pwd .= substr($pool,(rand()%($pool_lenght)),1);
    }    	  
    
    //create job and file  
    $jid = insertJob($pwd, $pid, '', $xml->Languages->attributes()->source, $xml->Languages->attributes()->target, '','');
    $fid = insertFile($pid, $fileName, $xml->Languages->attributes()->source, 'xml', 'uploaded');
    insertFilesJob($jid, $fid);
    print "job_id: ".$jid."\n";
    print "file_id: ".$fid."\n";
    
    //get translations
    $initials = [];
    $count = 0;
    //initial translations
    for($i = 0; $i < count($xml->initialTargetText->children()); $i++ ) {
        $id = $xml->initialTargetText->segment[$i]->attributes()->id;
        $suggestion = $xml->initialTargetText->segment[$i];
        $initials[$count] = [$id, $suggestion];
        $count = $count + 1;
    }
    
    $translations = [];
    $count = 0;
    //translations
    for($i = 0; $i < count($xml->finalTargetText->children()); $i++ ) {
        $id = $xml->finalTargetText->segment[$i]->attributes()->id;
        $trans = $xml->finalTargetText->segment[$i];
        //print "trans ".$id.": ".$trans."\n";
        $suggestion = "";
        //check if there is an initial translation
        for ($j = 0; $j < count($initials); $j++){
            if (strcmp($id,$initials[$j][0]) == 0){
                $suggestion = $initials[$j][1];
            }
        }        
        $translations[$count] = [$id, $suggestion, $trans];
        //print $translations[$count][0]."\n";
        //print $translations[$count][1]."\n";
        //print $translations[$count][2]."\n";
        
        $count = $count + 1;
    }    
    
    //get source
    for($i = 0; $i < count($xml->sourceText->children()); $i++ ) {
        
        $id = $xml->sourceText->segment[$i]->attributes()->id;
        print "ID: ".$id."\n";
        $sourceText = $xml->sourceText->segment[$i];        
        //print "sourceText: ".$sourceText."\n";   
        
        $data = array();
        $data['id_file'] = $fid;
        $data['internal_id'] = $id;
        $data['segment'] = $sourceText;	
        
        //to count the words of the string
        $app = trim($sourceText);
        $n = strlen($app);
        if ($app == "") {
            return 0;
        }

        $res = 0;
        $temp = array();

        $sourceText = preg_replace("#<.*?" . ">#si", "", $sourceText);
        $sourceText = preg_replace("#<\/.*?" . ">#si", "", $sourceText);

        $sourceText = str_replace(":", "", $sourceText);
        $sourceText = str_replace(";", "", $sourceText);
        $sourceText = str_replace("[", "", $sourceText);
        $sourceText = str_replace("]", "", $sourceText);
        $sourceText = str_replace("?", "", $sourceText);
        $sourceText = str_replace("!", "", $sourceText);
        $sourceText = str_replace("{", "", $sourceText);
        $sourceText = str_replace("}", "", $sourceText);
        $sourceText = str_replace("(", "", $sourceText);
        $sourceText = str_replace(")", "", $sourceText);
        $sourceText = str_replace("/", "", $sourceText);
        $sourceText = str_replace("\\", "", $sourceText);
        $sourceText = str_replace("|", "", $sourceText);
        $sourceText = str_replace("£", "", $sourceText);
        $sourceText = str_replace("$", "", $sourceText);
        $sourceText = str_replace("%", "", $sourceText);
        $sourceText = str_replace("-", "", $sourceText);
        $sourceText = str_replace("_", "", $sourceText);
        $sourceText = str_replace("#", "", $sourceText);
        $sourceText = str_replace("§", "", $sourceText);
        $sourceText = str_replace("^", "", $sourceText);
        $sourceText = str_replace("â€???", "", $sourceText);
        $sourceText = str_replace("&", "", $sourceText);

        // 08/02/2011 CONCORDATO CON MARCO : sostituire tutti i numeri con un segnaposto, in modo che il conteggio
        // parole consideri i segmenti che differiscono per soli numeri some ripetizioni (come TRADOS)
        $sourceText = preg_replace("/[0-9]+([\.,][0-9]+)*/", "<TRANSLATED_NUMBER>", $sourceText);

        $sourceText = str_replace(" ", "<sep>", $sourceText);
        $sourceText = str_replace(", ", "<sep>", $sourceText);
        $sourceText = str_replace(". ", "<sep>", $sourceText);
        $sourceText = str_replace("' ", "<sep>", $sourceText);
        $sourceText = str_replace(".", "<sep>", $sourceText);
        $sourceText = str_replace("\"", "<sep>", $sourceText);
        $sourceText = str_replace("\'", "<sep>", $sourceText);


        $app = explode("<sep>", $sourceText);
        foreach ($app as $a) {
            $a = trim($a);
            if ($a != "") {
                //voglio contare anche i numeri:
                //if(!is_number($a)) {
                $temp[] = $a;
                //}
            }
        }

        $num_words = count($temp);

        $data['raw_word_count'] = $num_words;
        
        //save translations into database

        $db->insert('segments', $data);

        $err = $db->get_error();
        $errno = $err["error_code"];

        if ($errno != 0) {
            log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
            throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
        }
        $queryId = $db->query("SELECT * FROM segments ORDER BY id DESC LIMIT 0 , 1");
        $err = $db->get_error();
        //log::doLog("CASMACAT: err(): " .print_r($err,true));
        $errno = $err["error_code"];
        if ($errno != 0) {
            log::doLog("CASMACAT: fetchLogChunk(): " . print_r($err, true));
            throw new Exception("CASMACAT: fetchLogChunk(): " . print_r($err, true));
            return $errno * -1;
        }
        $last_row = $db->fetch($queryId);
        
        for ($j = 0; $j < count($translations); $j++){
            
            if (strcmp($id,$translations[$j][0]) == 0){              
                $data = array();
                $data['id_segment'] = $last_row["id"];
                $data['id_job'] = $jid;
                $data['status'] = "TRANSLATED";
                $data['translation'] = $translations[$j][2];                
                $data['suggestion'] = $translations[$j][1];          

                $db->insert('segment_translations', $data);
            }
        }      
               
    }
    
    //events
    
    foreach($xml->events->children() as $name => $event){

        $value = $event->attributes();
        $logEvent = new LogEvent($jid, $fid, $value);
        $logEvent->type = $name;


        //insertLogEventHeader($logEvent);
        
        switch ($logEvent->type) {
                    case LogEvent::START_SESSION:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::STOP_SESSION:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::RESIZE:
                        $logEvent->resizeData($value);
                        insertResizeEvent($logEvent);
                        break;
                    case LogEvent::TEXT:
                        $logEvent->textData($value);
                        insertTextEvent($logEvent);
                        break;
                    case LogEvent::SELECTION:
                        $logEvent->selectionData($value);
                        insertSelectionEvent($logEvent);
                        break;
                    case LogEvent::SCROLL:
                        $logEvent->scrollData($value);
                        insertScrollEvent($logEvent);
                        break;
                    case LogEvent::GAZE:
                        $logEvent->gazeData($value);
                        insertGazeEvent($logEvent);
                        break;
                    case LogEvent::FIXATION:
                        $logEvent->fixationData($value);
                        insertFixationEvent($logEvent);
                        break;

                    case LogEvent::DRAFTED:
                    case LogEvent::TRANSLATED:
                    case LogEvent::APPROVED:
                    case LogEvent::REJECTED:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::VIEWPORT_TO_SEGMENT:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::SOURCE_COPIED:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::SEGMENT_OPENED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::SEGMENT_CLOSED:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::LOADING_SUGGESTIONS:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::SUGGESTIONS_LOADED:
                        $logEvent->suggestionsLoadedData($value);
                        insertSuggestionsLoadedEvent($logEvent);
                        break;
                    case LogEvent::SUGGESTION_CHOSEN:
                        $logEvent->suggestionChosenData($value);
                        insertSuggestionChosenEvent($logEvent);
                        break;
                    case LogEvent::DELETING_SUGGESTION:
                        $logEvent->deletingSuggestionData($value);
                        insertDeletingSuggestionEvent($logEvent);
                        break;
                    case LogEvent::SUGGESTION_DELETED:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::STATS_UPDATED:
                        $logEvent->statsUpdatedData($value);
                        insertStatsUpdatedEvent($logEvent);
                        break;
                    
                    case LogEvent::DECODE:
                    case LogEvent::ALIGNMENTS:
                    case LogEvent::SUFFIX_CHANGE:
                    case LogEvent::CONFIDENCES:
                    case LogEvent::TOKENS:
                    case LogEvent::SHOW_ALIGNMENT_BY_KEY:
                    case LogEvent::HIDE_ALIGNMENT_BY_KEY:
                        $logEvent->itpData($value);
                        insertItpEvent($logEvent);
                        break;
                    case LogEvent::SHOW_ALIGNMENT_BY_MOUSE:
                    case LogEvent::HIDE_ALIGNMENT_BY_MOUSE:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::KEY_DOWN:
                    case LogEvent::KEY_UP:
                        $logEvent->keyData($value);
                        insertKeyEvent($logEvent);
                        break;

                    case LogEvent::MOUSE_DOWN:
                    case LogEvent::MOUSE_UP:
                    case LogEvent::MOUSE_CLICK:
                    case LogEvent::MOUSE_MOVE:
                        $logEvent->mouseData($value);
                        insertMouseEvent($logEvent);
                        break;

                    case LogEvent::BEFORE_CUT:
                    case LogEvent::BEFORE_COPY:
                    case LogEvent::BEFORE_PASTE:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::VIS_MENU_DISPLAYED:
                    case LogEvent::VIS_MENU_HIDDEN:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::INITIAL_CONFIG:
                    case LogEvent::CONFIG_CHANGED:
                        $logEvent->configData($value);
                        insertConfigEvent($logEvent);
                        break;
                    case LogEvent::MOUSE_WHEEL_DOWN:
                    case LogEvent::MOUSE_WHEEL_UP:
                    case LogEvent::MOUSE_WHEEL_INVALIDATE:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::MEMENTO_UNDO:
                    case LogEvent::MEMENTO_REDO:
                    case LogEvent::MEMENTO_INVALIDATE:
                        insertLogEventHeader($logEvent);
                        break;

                    case LogEvent::SR_MENU_DISPLAYED:
                    case LogEvent::SR_MENU_HIDDEN:
                    case LogEvent::SR_MATCH_CASE_ON:
                    case LogEvent::SR_MATCH_CASE_OFF:
                    case LogEvent::SR_REG_EXP_ON:
                    case LogEvent::SR_REG_EXP_OFF:
                    case LogEvent::SR_RULES_SETTING:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::SR_RULES_SET:
                        $logEvent->srRulesSetData($value);
                        insertSrEvent($logEvent);
                        break;
                    case LogEvent::SR_RULES_APPLIED:
                    case LogEvent::SR_RULE_DELETED:
                        insertLogEventHeader($logEvent);
                        break;
                    // merc - adding float prediction, biconcordancer and translation_option
                    case LogEvent::FLOAT_PREDICTION:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::BICONCOR:
                        $logEvent->biconcorData($value);
                        insertBiconcorEvent($logEvent);
                        break;
                    case LogEvent::BICONCOR_CLOSED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::TRANSLATION_OPTION:
                        insertLogEventHeader($logEvent);
                        break;
                    // merc - adding epen
                    case LogEvent::EPEN_OPENED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::EPEN_CLOSED:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::HTR_RESULT:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_UPDATE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_NBEST_CLICK:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_TEXT_CHANGE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_START:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;              
                    case LogEvent::HTR_ADD_STROKE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;                   
                    case LogEvent::HTR_END:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    case LogEvent::HTR_GESTURE:
                        $logEvent->epenData($value);
                        insertEpenEvent($logEvent);
                        break;
                    // merc - blur/focus
                    case LogEvent::BLUR:
                        insertLogEventHeader($logEvent);
                        break;
                    case LogEvent::FOCUS:
                        insertLogEventHeader($logEvent);
                        break;
                                        
                    default:
                        log::doLog("CASMACAT: uploadXML: '$logEvent->type' at index: '$key'"); 
            }
        }	
}
?>

