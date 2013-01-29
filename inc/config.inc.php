<?php
class INIT {
    private static $instance;

    public static $ROOT;
    public static $BASEURL;
    public static $DEBUG;
    public static $DB_SERVER;
    public static $DB_DATABASE;
    public static $DB_USER;
    public static $DB_PASS;
    public static $LOG_REPOSITORY;
    public static $TEMPLATE_ROOT;
    public static $MODEL_ROOT;
    public static $CONTROLLER_ROOT;
    public static $UTILS_ROOT;
    
    public static $DEFAULT_NUM_RESULTS_FROM_TM;
    public static $THRESHOLD_MATCH_TM_NOT_TO_SHOW;
    public static $TIME_TO_EDIT_ENABLED;
    public static $ENABLED_BROWSERS;
    public static $BUILD_NUMBER;

    public static $CATSERVER;
    public static $HTRSERVER;


    public static function obtain() {        
        if (!self::$instance) {
            self::$instance = new INIT();
        }
        return self::$instance;
    }

     private function __construct() {
        $root = realpath(dirname(__FILE__).'/../');
        self::$ROOT = $root;  // Accesible by Apache/PHP

        $ini = parse_ini_file(dirname(__FILE__).'/config.ini', true);

        self::$BASEURL = $ini['ui']['baseurl']; // Accesible by the browser
        
	set_include_path(get_include_path() . PATH_SEPARATOR . $root);

        self::$TIME_TO_EDIT_ENABLED = $ini['ui']['timetoedit'];
        
        self::$DEFAULT_NUM_RESULTS_FROM_TM=$ini['mymemory']['numresults'];
	self::$THRESHOLD_MATCH_TM_NOT_TO_SHOW=$ini['mymemory']['matchthreshold'];

        self::$DB_SERVER = $ini['db']['hostname'];
               self::$DB_DATABASE = $ini['db']['database'];
                self::$DB_USER = $ini['db']['username'];
                self::$DB_PASS = $ini['db']['password'];
 

        self::$LOG_REPOSITORY = self::$ROOT . "/storage/log_archive";
        self::$TEMPLATE_ROOT = self::$ROOT . "/lib/view";
        self::$MODEL_ROOT = self::$ROOT . '/lib/model';
        self::$CONTROLLER_ROOT = self::$ROOT . '/lib/controller';
        self::$UTILS_ROOT = self::$ROOT . '/lib/utils';

	self::$ENABLED_BROWSERS=array('chrome','firefox','safari');
	self::$BUILD_NUMBER='0.3.0';

        // Custom translation/HTR servers (TODO: see how can integrate $_GET params with rewritten URLs)
        self::$CATSERVER = isset($_GET['catserver']) ? $_GET['catserver'] : $ini['casmacat']['catserver'];
        self::$HTRSERVER = isset($_GET['htrserver']) ? $_GET['htrserver'] : $ini['casmacat']['htrserver'];
    }

}
?>
