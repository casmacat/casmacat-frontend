<?php

include_once INIT::$MODEL_ROOT . "/casQueries.php";

class createLogDOwnloadController extends downloadController {
    
    private $id_job;
    private $id_file;
    private $file_name;
    private $src_lang;
    
    public function __construct() {
        parent::__construct();
//echo "<pre>";print_r ($_POST);
        
        $this->id_file = $this->get_from_get_post('fileid');
        $this->id_job = $this->get_from_get_post('jid');
        $this->file_name = $this->get_from_get_post('filename');
        $this->src_lang = $this->get_from_get_post('srclang');
               
        log::doLog("POST: ".print_r($_POST, true));
        
        if (empty($this->id_job)) {
            $this->id_job = "Unknown";
        }
    }
    

    
    public function doAction() {

	ini_set('memory_limit', '8000M');        
        $db = Database::obtain();
        $queryId = $db->query("SELECT COUNT(*) FROM log_event_header h WHERE h.job_id = $this->id_job AND h.file_id = $this->id_file");

        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            log::doLog("CASMACAT: fetchLengthEvents: " . print_r($err, true));
            return $errno * -1;
        }
        //log::doLog("CASMACAT: fetchLengthEvents(): Event headers found: '$db->affected_rows' ");

        $row = $db->fetch($queryId);
        //log::doLog("Total = ".$row["COUNT(*)"]);
        $this->filename ="log".$this->id_file.".xml";

        //SELECT COUNT(*) to know the lenght of the table, we will do the query with just 100 items. Otherwise will be very heavy
        $total = $row["COUNT(*)"];
        $end = 0;
        
        //doc creation
        $doc = new DomDocument("1.0", "UTF-8");
        $doc->formatOutput = true;

        $root = createAndAppendElement($doc, $doc, 'logfile');
        $root->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $root->setAttribute('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema');
        
        $tmp = createAndAppendElement($doc, $root, 'version');
        $tmp->appendChild($doc->createTextNode('CASMACAT')); // TODO add real CASMACAT version string

        $tmp = createAndAppendElement($doc, $root, 'jobId');
        $tmp->appendChild($doc->createTextNode($this->id_job));

        //TODO write the correct translator
        $tmp = createAndAppendElement($doc, $root, 'username');
        $tmp->appendChild($doc->createTextNode('test'));

        $tmp = createAndAppendElement($doc, $root, 'fileId');
        $tmp->appendChild($doc->createTextNode($this->id_file));

        $tmp = createAndAppendElement($doc, $root, 'documentName');
        $tmp->appendChild($doc->createTextNode($this->file_name));
        
        // add language inforamtion
        $tmp = createAndAppendElement($doc, $root, 'languages');
        
        log::doLog("Src_lang = ".$this->src_lang);

        $tmp->setAttribute('source', $this->src_lang);     
        
        // target language
        $queryId = $db->query("SELECT target FROM `files_job` fj, `jobs` j WHERE j.id = fj.id_job AND fj.id_file = $this->id_file AND fj.id_job = $this->id_job");

        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            log::doLog("Target language error: " . print_r($err, true));
            return $errno * -1;
        }
        //log::doLog("CASMACAT: fetchTargetLang(): Event headers found: '$db->affected_rows' ");

        $row = $db->fetch($queryId);
        log::doLog("Target lang = ".$row["target"]);
        
        $tmp->setAttribute('target', $row['target']); 

                
        $queryId = $db->query("SELECT s.segment, s.id FROM `files_job` fj, `segments` s WHERE s.id_file = $this->id_file AND fj.id_file = $this->id_file AND fj.id_job = $this->id_job");
    
        
        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            //log::doLog("CASMACAT: fetchSegments(): " . print_r($err, true));
            return $errno * -1;
        }
        //log::doLog("CASMACAT: fetchSegments(): Event headers found: '$db->affected_rows' ");

        // Source text
        $sourceTextElement = createAndAppendElement($doc, $root, 'sourceText');
        $initialTargetTextElement = createAndAppendElement($doc, $root, 'initialTargetText');
        $finalTargetTextElement = createAndAppendElement($doc, $root, 'finalTargetText');
        
        
        
        $logSegments = array();
        $row = null;
        while ( ($row = $db->fetch($queryId)) != false ) {
            //log::doLog("CASMACAT: fetchSegments(): Next row: " . print_r($row, true));

            $tmp = createAndAppendElement($doc, $sourceTextElement, 'segment');
            $tmp->setAttribute('id', $row['id']);
            $tmp->appendChild($doc->createTextNode($row['segment']));            
        }

	//Check if it is ITP
	$itp = 0;
	$queryId = $db->query("SELECT element_id, data FROM `log_event_header` l, itp_event i WHERE l.type = 'decode' AND l.job_id = $this->id_job AND l.file_id = $this->id_file AND i.header_id = l.id");
        while ( ($row = $db->fetch($queryId)) != false ) {
            	//log::doLog("CASMACAT: fetchTranslations(): Next row: " . print_r($row, true));
		$itp = 1;

		$json = $row["data"];
		$obj = json_decode($json);
		$nbest = $obj->{'nbest'};
        	//log::doLog("nbest = ".print_r($nbest,true));
        	$inisuggestion = $nbest[0]->target;
        	//log::doLog("suggestion ITP = ".$inisuggestion);
            	$tmp = createAndAppendElement($doc, $initialTargetTextElement, 'segment');
        	list($segment, $id, $editarea) = split("-",$row['element_id']);

            	$tmp->setAttribute('id', $id);
            	$tmp->appendChild($doc->createTextNode($inisuggestion));
	}
				
        log::doLog("ITP= ".$itp);
        // Target text
        $queryId = $db->query("SELECT id_segment, translation, suggestion FROM `segment_translations` st, `files_job` fj WHERE st.id_job = $this->id_job AND fj.id_job = $this->id_job AND fj.id_file = $this->id_file");
        //log::doLog("queryId: ".$queryId);

        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            //log::doLog("CASMACAT: fetchTranslations(): " . print_r($err, true));
            return $errno * -1;
        }
        //log::doLog("CASMACAT: fetchTranslations(): Event headers found: '$db->affected_rows' ");

        $logSegments = array();
        $row = null;
        while ( ($row = $db->fetch($queryId)) != false ) {
            //log::doLog("CASMACAT: fetchTranslations(): Next row: " . print_r($row, true));
            if ($itp == 0) {
            	$tmp = createAndAppendElement($doc, $initialTargetTextElement, 'segment');
            	$tmp->setAttribute('id', $row['id_segment']);
            	$tmp->appendChild($doc->createTextNode($row['suggestion']));
	    }
            $tmp = createAndAppendElement($doc, $finalTargetTextElement, 'segment');
            $tmp->setAttribute('id', $row['id_segment']);
            $tmp->appendChild($doc->createTextNode($row['translation']));  

        }         
        
        //Events
        $eventElements = createAndAppendElement($doc, $root, 'events');
        
        $data = '';
        $ini = 0;
        $end = 0;
        //log::doLog("total = ".$total);

        while ($total > 100){
            
            $end = $end + 100;
            
            //log::doLog("ini = ".$ini);
            //log::doLog("end = ".$end);
            
            
            $total = $total - 100;
            $result = fetchLogChunk($this->id_job, $this->id_file, $ini, $end);        
            
            //log::doLog("result = ".$result);
            $data = $data.print_r($result, true);
            //log::doLog("total = ".$total);
            //log::doLog("data = ".print_r($data, true));
            
            for ($i=0; $i<100; $i++){
                $tmp = createAndAppendElement($doc, $eventElements, $result[$i]->type);
                $tmp->setAttribute('id', $result[$i]->id);
            
                //Recorrer elementos del objeto
                foreach($result[$i] as $attribute => $val){
                
                    if ($attribute != jobId and $attribute != fileId and $attribute != type){
                        $tmp->setAttribute($attribute, $val); 
                    }
                }
            }

            $ini = $ini + 100;


        } 

        $result = fetchLogChunk($this->id_job, $this->id_file, $end, $total);
        $data = $data.print_r($result, true);
        //log::doLog("data = ".print_r($data, true));
        $len = count($result);
        for ($i=0; $i<$len; $i++){
            $tmp = createAndAppendElement($doc, $eventElements, $result[$i]->type);
            $tmp->setAttribute('id', $result[$i]->id);
            
            //Recorrer elementos del objeto
            foreach($result[$i] as $attribute => $val){
                
                if ($attribute != jobId and $attribute != fileId and $attribute != type){
                    $tmp->setAttribute($attribute, $val); 
                }
            }

        }
        
        //log::doLog("Events = ".print_r($data, true));
        
        
        
        header('Content-Type: text/xml; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $this->filename . '.xml"');

        $this->content = $doc->saveXML();

    }
    
}
    
?>
