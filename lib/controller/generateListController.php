<?php


    /*
     * Script:    DataTables server-side script for PHP and MySQL
     * Copyright: 2010 - Allan Jardine, 2012 - Chris Wright
     * License:   GPL v2 or BSD (3-point)
     */
     
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
     * Easy set variables
     */
    class generateListController extends ajaxcontroller { 
    /* Array of database columns which should be read and sent back to DataTables. Use a space where
     * you want to insert a non-database field (for example a counter or static image)
     */  

    
    public function __construct() {
        
        parent::__construct();
        
    }
    
    public function doAction() {        
    
        $aColumns = array( 'id', 'filename', 'source_language', 'id_project', 'id_job', 'password');
     
        /* Indexed column (used for fast and accurate table cardinality) */
        $sIndexColumn = "id";
     
        /* DB table to use */
        $sTable = "v_files_jobs";
        /*
        * MySQL connection
        */
        $db = Database::obtain();
        
        
//        $mysql_hostname = INIT::$DB_SERVER;   // Database Server machine
//        $mysql_database = INIT::$DB_DATABASE;     // Database Name
//        $mysql_username = INIT::$DB_USER;   // Database User
//        $mysql_password = INIT::$DB_PASS;;   // Database Password
//        
//        $mysql_link = mysql_connect($mysql_hostname, $mysql_username, $mysql_password);
//        mysql_select_db($mysql_database, $mysql_link);
//
//        $query_segment = array();
    
         //log::doLog(print_r($_GET, true));
   
        /*
         * Paging
        */ 
        $sLimit = "";
        if ( isset( $_GET['iDisplayStart'] ) && $_GET['iDisplayLength'] != '-1' )
        {
            $sLimit = "LIMIT ".intval( $_GET['iDisplayStart'] ).", ".
                intval( $_GET['iDisplayLength'] );
        }
     
        /*
        * Ordering
        */
        $sOrder = "";
        if ( isset( $_GET['iSortCol_0'] ) )
        {
            $sOrder = "ORDER BY  ";
            for ( $i=0 ; $i<intval( $_GET['iSortingCols'] ) ; $i++ )
            {
                if ( $_GET[ 'bSortable_'.intval($_GET['iSortCol_'.$i]) ] == "true" )
                {
                    $sOrder .= $aColumns[ intval( $_GET['iSortCol_'.$i] ) ]."
                        ".($_GET['sSortDir_'.$i]==='asc' ? 'asc' : 'desc') .", ";
                }
            }
         
            $sOrder = substr_replace( $sOrder, "", -2 );
            if ( $sOrder == "ORDER BY" )
            {
                $sOrder = "";
            }
        }
     
     
        /*
        * Filtering
        * NOTE this does not match the built-in DataTables filtering which does it
        * word by word on any field. It's possible to do here, but concerned about efficiency
        * on very large tables, and MySQL's regex functionality is very limited
        */
        $sWhere = "";
        if ( isset($_GET['sSearch']) && $_GET['sSearch'] != "" )
        {
            $sWhere = "WHERE (";
            for ( $i=0 ; $i<count($aColumns) ; $i++ )
            {
                if ( isset($_GET['bSearchable_'.$i]) && $_GET['bSearchable_'.$i] == "true" )
                {
                    $sWhere .= $aColumns[$i]." LIKE '%".mysql_real_escape_string( $_GET['sSearch'] )."%' OR ";
                }
            }
            $sWhere = substr_replace( $sWhere, "", -3 );
            $sWhere .= ')';
        }
     
        /* Individual column filtering */
        for ( $i=0 ; $i<count($aColumns) ; $i++ )
        {
            if ( isset($_GET['bSearchable_'.$i]) && $_GET['bSearchable_'.$i] == "true" && $_GET['sSearch_'.$i] != '' )
            {
                if ( $sWhere == "" )
                {
                    $sWhere = "WHERE ";
                }
                else
                {
                    $sWhere .= " AND ";
                }
                $sWhere .= $aColumns[$i]." LIKE '%".mysql_real_escape_string($_GET['sSearch_'.$i])."%' ";
            }
        }

     
    /*
     * SQL queries
     * Get data to display
     */
    
    $sQuery = "
        SELECT SQL_CALC_FOUND_ROWS ".str_replace(" , ", " ", implode(", ", $aColumns))."
        FROM   $sTable
        $sWhere
        $sOrder
        $sLimit
    ";
    $rResult = $db->query($sQuery);
//    $rResult = mysql_query( $sQuery, $mysql_link );
//log::doLog($sQuery);
//log::doLog(mysql_affected_rows());
    /* Data set length after filtering */
    
    $sQuery = "
        SELECT FOUND_ROWS()
    ";
//    $rResultFilterTotal = mysql_query( $sQuery, $mysql_link );
    $rResultFilterTotal = $db->query($sQuery);
    //$aResultFilterTotal = mysql_fetch_array($rResultFilterTotal);
    $aResultFilterTotal = $db->fetch($rResultFilterTotal);
    //log::doLog("aResultFilteredTotal = ".print_r($aResultFilterTotal, true));
    $iFilteredTotal = $aResultFilterTotal["FOUND_ROWS()"];
    //log::doLog("iFilteredTotal = ".$iFilteredTotal);
     
    /* Total data set length */
    
    $sQuery = "
        SELECT COUNT(".$sIndexColumn.")
        FROM   $sTable
    ";
//    $rResultTotal = mysql_query( $sQuery, $mysql_link);
    $rResultTotal = $db->query($sQuery);
    $aResultTotal = $db->fetch($rResultTotal);
//    $aResultTotal = mysql_fetch_array($rResultTotal);
    //log::doLog("aResultTotal = ".print_r($aResultTotal, true));
    $iTotal = $aResultTotal["COUNT(id)"]; 
    //log::doLog("iTotal = ".$iTotal);
     
    /*
     * Output
     */
    $output = array(
        "sEcho" => intval($_GET['sEcho']),
        "iTotalRecords" => $iTotal,
        "iTotalDisplayRecords" => $iFilteredTotal,
        "aaData" => array()
    );
    
    
//    while ( $aRow = mysql_fetch_array( $rResult ) )
    while ( $aRow = $db->fetch( $rResult ) )
    {
        $row = array();
        for ( $i=0 ; $i<count($aColumns) ; $i++ )
        {
            if ( $aColumns[$i] == "version" )
            {
                /* Special output formatting for 'version' column */
                
                $row[] = ($aRow[ $aColumns[$i] ]=="0") ? '-' : $aRow[ $aColumns[$i] ];
            }
            else if ( $aColumns[$i] != ' ' )
            {
                /* General output */
                
                $row[] = $aRow[ $aColumns[$i] ];
            }
        }
        $output['aaData'][] = $row;
    }
     
    //log::doLog($output);
    
//    echo json_encode( $output );
//    $this->result["code"] = 0;
//    $this->result["data"] = "OK";
    $this->result = null;
    $this->result = $output;
    }
    }
?>
