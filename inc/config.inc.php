<?php
global $_INI_FILE; // Global because of the ini_sets
$_INI_FILE = parse_ini_file(dirname(__FILE__).'/config.ini', true);
// TODO: This INI should be parsed *only once*.
// Probably we should cache config vars in $_SESSION or something similar.

$display_errors = $_INI_FILE['debug']['displayerrors'];
ini_set("display_errors", $display_errors);
if ($display_errors) {
  ini_set("error_reporting", eval("return ".$_INI_FILE['debug']['errorreporting'].";"));
}

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
    public static $SOURCE_LANGUAGE;
    public static $TARGET_LANGUAGE;
    public static $BICONCOR_SERVER;
    public static $ITP_ENABLED;
    public static $PEN_ENABLED;
    public static $ET_ENABLED;
    public static $SR_ENABLED;
    public static $BICONCOR_ENABLED;
    public static $TOUCHEDIT_ENABLED;
    public static $HIDE_CONTRIBUTIONS;
    public static $FLOAT_PREDICTIONS;
    public static $TRANSLATION_OPTIONS;
    public static $ALLOW_CHANGE_VISUALIZATION_OPTIONS;
    public static $MODE;
    public static $ITP_DRAFT_ONLY;
    public static $DISPLAY_MOUSE_ALIGN;
    public static $DISPLAY_CARET_ALIGN;
    public static $DISPLAY_SHADE_OFF_TRANSLATED_SOURCE;
    public static $DISPLAY_CONFIDENCES;
    public static $HIGHLIGHT_VALIDATED;
    public static $HIGHLIGHT_PREFIX;
    public static $HIGHLIGHT_SUFFIX;
    public static $HIGHLIGHT_LAST_VALIDATED;
    public static $LIMIT_SUFFIX_LENGTH;
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
        self::$ITP_SERVER  = self::getConfig('itpserver');
        self::$HTR_SERVER  = self::getConfig('htrserver');
        self::$BICONCOR_SERVER  = self::getConfig('biconcorserver');
        self::$SOURCE_LANGUAGE = self::getConfig('sourcelanguage');
        self::$TARGET_LANGUAGE = self::getConfig('targetlanguage');
        self::$ITP_ENABLED = self::getConfigBool('itpenabled');
        self::$PEN_ENABLED = self::getConfigBool('penenabled');
        self::$ET_ENABLED  = self::getConfigBool('etenabled');
        self::$SR_ENABLED  = self::getConfigBool('srenabled');
        self::$BICONCOR_ENABLED = self::getConfigBool('biconcorenabled');
        self::$TOUCHEDIT_ENABLED = self::getConfigBool('toucheditenabled');
        self::$HIDE_CONTRIBUTIONS = self::getConfigBool('hidecontributions');
        self::$FLOAT_PREDICTIONS = self::getConfigBool('floatpredictions');
        self::$TRANSLATION_OPTIONS = self::getConfigBool('translationoptions');
        self::$ALLOW_CHANGE_VISUALIZATION_OPTIONS = self::getConfigBool('allowchangevisualizationoptions');
        self::$MODE = self::getConfig('mode');
        self::$ITP_DRAFT_ONLY = self::getConfigBool('itpdraftonly');
        self::$DISPLAY_MOUSE_ALIGN = self::getConfigBool('displayMouseAlign');
        self::$DISPLAY_CARET_ALIGN = self::getConfigBool('displayCaretAlign');
        self::$DISPLAY_SHADE_OFF_TRANSLATED_SOURCE = self::getConfigBool('displayShadeOffTranslatedSource');
        self::$DISPLAY_CONFIDENCES = self::getConfigBool('displayconfidences');
        self::$HIGHLIGHT_VALIDATED = self::getConfigBool('highlightValidated');
        self::$HIGHLIGHT_PREFIX = self::getConfigBool('highlightPrefix');
        self::$HIGHLIGHT_SUFFIX = self::getConfigBool('highlightSuffix');
        self::$HIGHLIGHT_LAST_VALIDATED = self::getConfigBool('highlightLastValidated');
        self::$LIMIT_SUFFIX_LENGTH = self::getConfigBool('limitSuffixLength');
        self::$ET_TYPE     = self::getConfig('ettype', "casmacat", 0);
        self::$DEBUG       = self::getConfigBool('debug', "debug");
    }

    private static function getConfig($name, $namespace = "casmacat", $default_value = "") {
      global $_INI_FILE;
      $retval = $default_value;
      if (isset($_GET[$name])) $retval = $_GET[$name];
      elseif (isset($_INI_FILE[$namespace][$name])) $retval = $_INI_FILE[$namespace][$name];
      return $retval;
    }
    
    private static function getConfigBool($name, $namespace = "casmacat", $default_value = false) {
      return (bool)self::getConfig($name, $namespace, $default_value);
    }

}

INIT::obtain(); // initializes static variables in any case

?>
