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
        
        $db = Database::obtain();
        $queryId = $db->query("SELECT COUNT(*) FROM log_event_header h WHERE h.job_id = $this->id_job AND h.file_id = $this->id_file");

        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            log::doLog("CASMACAT: fetchLengthEvents: " . print_r($err, true));
            return $errno * -1;
        }
        log::doLog("CASMACAT: fetchLengthEvents(): Event headers found: '$db->affected_rows' ");

        $row = $db->fetch($queryId);
        log::doLog("Total = ".$row["COUNT(*)"]);
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
        log::doLog("CASMACAT: fetchTargetLang(): Event headers found: '$db->affected_rows' ");

        $row = $db->fetch($queryId);
        log::doLog("Target lang = ".$row["target"]);
        
        $tmp->setAttribute('target', $row['target']); 

                
        $queryId = $db->query("SELECT s.segment, s.id FROM `files_job` fj, `segments` s WHERE s.id_file = $this->id_file AND fj.id_file = $this->id_file AND fj.id_job = $this->id_job");
    
        
        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            log::doLog("CASMACAT: fetchSegments(): " . print_r($err, true));
            return $errno * -1;
        }
        log::doLog("CASMACAT: fetchSegments(): Event headers found: '$db->affected_rows' ");

        // Source text
        $sourceTextElement = createAndAppendElement($doc, $root, 'sourceText');
        $targetTextElement = createAndAppendElement($doc, $root, 'targetText');
        
        
        
        $logSegments = array();
        $row = null;
        while ( ($row = $db->fetch($queryId)) != false ) {
            log::doLog("CASMACAT: fetchSegments(): Next row: " . print_r($row, true));

            $tmp = createAndAppendElement($doc, $sourceTextElement, 'segment');
            $tmp->setAttribute('id', $row['id']);
            $tmp->appendChild($doc->createTextNode($row['segment']));            
        }

        // Target text
        $queryId = $db->query("SELECT id_segment, translation FROM `segment_translations` st, `files_job` fj WHERE st.id_job = $this->id_job AND fj.id_job = $this->id_job AND fj.id_file = $this->id_file");
        log::doLog("queryId: ".$queryId);

        $err = $db->get_error();
        $errno = $err["error_code"];
        if ($errno != 0) {
            log::doLog("CASMACAT: fetchTranslations(): " . print_r($err, true));
            return $errno * -1;
        }
        log::doLog("CASMACAT: fetchTranslations(): Event headers found: '$db->affected_rows' ");

        $logSegments = array();
        $row = null;
        while ( ($row = $db->fetch($queryId)) != false ) {
            log::doLog("CASMACAT: fetchTranslations(): Next row: " . print_r($row, true));
            
            $tmp = createAndAppendElement($doc, $targetTextElement, 'segment');
            $tmp->setAttribute('id', $row['id_segment']);
            $tmp->appendChild($doc->createTextNode($row['translation']));            
        }         
        
        //Events
        $eventElements = createAndAppendElement($doc, $root, 'events');
        
        $data = '';
        while ($total > 100){
            $end = 100;
            $total = $total - 100;
            $result = fetchLogChunk($this->id_job, $this->id_file, 0, $end);        
            
            $data = $data.print_r($result, true);
        } 

        $result = fetchLogChunk($this->id_job, $this->id_file, 0, $total);
        $data = $data.print_r($result, true);
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
