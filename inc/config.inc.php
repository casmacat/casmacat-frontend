<?php
global $_INI_FILE; // Global because of the ini_sets
$_INI_FILE = parse_ini_file(dirname(__FILE__).'/config.ini', true);
// TODO: This INI should be parsed *only once*.
// Probably we should cache config vars in $_SESSION or something similar.

ini_set("display_errors", (bool) $_INI_FILE['debug']['displayerrors']);
ini_set("error_reporting", eval("return ".$_INI_FILE['debug']['errorreporting'].";"));

class INIT {
    private static $instance;

    public static $DEBUG;
    public static $ERROR_REPORTING;

    public static $ROOT;
    public static $BASE_URL;
    public static $DB_SERVER;
    public static $DB_DATABASE;
    public static $DB_USER;
    public static $DB_PASS;
    public static $LOG_REPOSITORY;
    public static $LOG_FILENAME;
    public static $LOG_DOWNLOAD;

    public static $TEMPLATE_ROOT;
    public static $MODEL_ROOT;
    public static $CONTROLLER_ROOT;
    public static $UTILS_ROOT;
    public static $UPLOAD_ROOT;

    public static $DEFAULT_NUM_RESULTS_FROM_TM;
    public static $THRESHOLD_MATCH_TM_NOT_TO_SHOW;
    public static $TIME_TO_EDIT_ENABLED;
    public static $ENABLED_BROWSERS;
    public static $BUILD_NUMBER;

    public static $LOG_ENABLED;
    public static $LOG_MAXCHUNKSIZE;
    public static $ITP_SERVER;
    public static $HTR_SERVER;
    public static $ITP_ENABLED;
    public static $PEN_ENABLED;
    public static $ET_ENABLED;
    public static $SR_ENABLED;
    public static $ET_TYPE;


    public static function obtain() {
        if (!self::$instance) {
            self::$instance = new INIT();
        }
        return self::$instance;
    }

     private function __construct() {
        // Read general config from INI file
        global $_INI_FILE;

        $root = realpath(dirname(__FILE__).'/../');
        self::$ROOT = $root;  // Accesible by Apache/PHP

        self::$BASE_URL = $_INI_FILE['ui']['baseurl']; // Accesible by the browser

	set_include_path(get_include_path() . PATH_SEPARATOR . $root);

        self::$TIME_TO_EDIT_ENABLED = self::getConfigBool('timetoedit', 'ui');

        self::$DEFAULT_NUM_RESULTS_FROM_TM=$_INI_FILE['mymemory']['numresults'];
	self::$THRESHOLD_MATCH_TM_NOT_TO_SHOW=$_INI_FILE['mymemory']['matchthreshold'];

        self::$DB_SERVER = $_INI_FILE['db']['hostname'];
               self::$DB_DATABASE = $_INI_FILE['db']['database'];
                self::$DB_USER = $_INI_FILE['db']['username'];
                self::$DB_PASS = $_INI_FILE['db']['password'];

        self::$LOG_ENABLED = self::getConfigBool('logenabled', 'ui');
        self::$LOG_MAXCHUNKSIZE = isset($_INI_FILE['ui']['logmaxchunksize']) ? $_INI_FILE['ui']['logmaxchunksize'] : 3000;

        self::$LOG_REPOSITORY = self::$ROOT . "/". $_INI_FILE['log']['directory'];
        self::$LOG_FILENAME = $_INI_FILE['log']['filename'];

        //log download
        self::$LOG_DOWNLOAD = self::$ROOT . "/". $_INI_FILE['download_temp']['directory'];

        self::$TEMPLATE_ROOT = self::$ROOT . "/lib/view";
        self::$MODEL_ROOT = self::$ROOT . '/lib/model';
        self::$CONTROLLER_ROOT = self::$ROOT . '/lib/controller';
        self::$UTILS_ROOT = self::$ROOT . '/lib/utils';
        self::$UPLOAD_ROOT = self::$ROOT . "/" . $_INI_FILE['ui']['uploads'];

	self::$ENABLED_BROWSERS=array('chrome','firefox','safari');
	self::$BUILD_NUMBER='0.3.0';

        // Casmacat customizations
        self::$ITP_SERVER = isset($_GET['itpserver']) ? $_GET['itpserver'] : $_INI_FILE['casmacat']['itpserver'];
        self::$HTR_SERVER = isset($_GET['htrserver']) ? $_GET['htrserver'] : $_INI_FILE['casmacat']['htrserver'];
        self::$ITP_ENABLED = self::getConfigBool('itpenabled');
        self::$PEN_ENABLED = self::getConfigBool('penenabled');
        self::$ET_ENABLED = self::getConfigBool('etenabled');
        self::$SR_ENABLED = self::getConfigBool('srenabled');
        self::$ET_TYPE = isset($_INI_FILE['casmacat']['ettype']) ? $_INI_FILE['casmacat']['ettype'] : 0;

        self::$DEBUG = self::getConfigBool('debug', "debug");
    }

    private static function getConfigBool($name, $namespace = "casmacat", $default_value = false) {
      global $_INI_FILE;
      $retval = $default_value;
      if (isset($_GET[$name])) $retval = $_GET[$name];
      else if (isset($_INI_FILE[$namespace][$name])) $retval = $_INI_FILE[$namespace][$name];
      return (bool)$retval;
    }

}

INIT::obtain(); // initializes static variables in any case

?>
