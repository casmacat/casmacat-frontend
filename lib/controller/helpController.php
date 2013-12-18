<?php

    include_once realpath(dirname(__FILE__) . '/../../') . '/lib/utils/parsedown.class.php';

    /*
     * Script:    DataTables server-side script for PHP and MySQL
     * Copyright: 2010 - Allan Jardine, 2012 - Chris Wright
     * License:   GPL v2 or BSD (3-point)
     */
     
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * Easy set variables
     */
    class helpController extends viewcontroller { 
    /* Array of database columns which should be read and sent back to DataTables. Use a space where
     * you want to insert a non-database field (for example a counter or static image)
     */
        
    
    
        public function __construct() {
        
            parent::__construct();
            parent::makeTemplate("help.html");
   
        }
    
        public function doAction() {        
    

        }
        
        public function setTemplateVars() {

            $md = Parsedown::instance();
            $content = $md->parse(file_get_contents(realpath(dirname(__FILE__) . '/../../')."/lib/view/help.txt"));
            $content = str_replace('${basepath}', INIT::$BASE_URL, $content);
            $this->template->content = $content;
            $this->template->basepath = INIT::$BASE_URL;
        }
    }
?>
