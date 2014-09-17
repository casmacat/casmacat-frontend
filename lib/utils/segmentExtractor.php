<?
include_once INIT::$UTILS_ROOT . "/cat.class.php";
include_once INIT::$UTILS_ROOT . "/xliff.parser.1.2.class.php";


function extractSegments($files_path, $file, $pid, $fid, $jid) {

	// Output
	// true = ok
	// -1   = Extension not supported
	// -2   = Parse Error
	// -3   = DB Error

	$mysql_hostname = INIT::$DB_SERVER;   // Database Server machine
	$mysql_database = INIT::$DB_DATABASE;     // Database Name
	$mysql_username = INIT::$DB_USER;   // Database User
	$mysql_password = INIT::$DB_PASS;;   // Database Password

	$mysql_link = mysql_connect($mysql_hostname, $mysql_username, $mysql_password);
	mysql_select_db($mysql_database, $mysql_link);

	$query_segment = array();

	// Checking Extentions
	$info = pathinfo($file);
    if (($info['extension'] == 'xliff')||($info['extension'] == 'sdlxliff')||($info['extension'] == 'xlf')) {
            $content = file_get_contents("$files_path/$file");
    } else {
	   log::doLog("Xliff Import: Extension ".$info['extension']." not managed");
	   return false;
    }

    $xliff_obj = new Xliff_Parser();
    $xliff = $xliff_obj->Xliff2Array($content);
     //log::doLog($xliff);

    // Checking that parsing went well
    if (isset($xliff['parser-errors']) or !isset($xliff['files']))
    	{
	    	log::doLog("Xliff Import: Error parsing. " . join("\n",$xliff['parser-errors']));
	    	return false;
    	}

    // Creating the Query
	foreach ($xliff['files'] as $xliff_file) {
                $count = 0;
		foreach ($xliff_file['trans-units'] as $xliff_trans_unit)  {
                        $count = $count + 1;
			if (!isset($xliff_trans_unit['attr']['translate'])) {
				$xliff_trans_unit['attr']['translate']='yes';
			}

			if ($xliff_trans_unit['attr']['translate']=="no") {
				log::doLog("Xliff Import: Skipping segment marked as non-translatable: ".$xliff_trans_unit['source']['raw-content']);
			} else {
				// If the XLIFF is already segmented (has <seg-source>)
				if (isset($xliff_trans_unit['seg-source'])) {
					foreach ($xliff_trans_unit['seg-source'] as $seg_source) {
						$show_in_cattool=1;
						$tempSeg = stripTagsFromSource2($seg_source['raw-content']);
						$tempSeg = trim($tempSeg);
						if (empty($tempSeg)) {
							$show_in_cattool=0;
						}
						$mid		   = mysql_real_escape_string($seg_source['mid']);
						$ext_tags	   = mysql_real_escape_string($seg_source['ext-prec-tags']);
						$source		   = mysql_real_escape_string($seg_source['raw-content']);
						$ext_succ_tags	   = mysql_real_escape_string($seg_source['ext-succ-tags']);
						$num_words 	   = CatUtils::segment_raw_wordcount($seg_source['raw-content']);
						$trans_unit_id	   = mysql_real_escape_string($xliff_trans_unit['attr']['id']);
						$query_segment   = "('$trans_unit_id',$fid,'$source',$num_words,'$mid','$ext_tags','$ext_succ_tags',$show_in_cattool)";
					}

				} else {
					$show_in_cattool=1;
					$tempSeg = stripTagsFromSource2($xliff_trans_unit['source']['raw-content']);
					$tempSeg = trim($tempSeg);

					if (empty($tempSeg)) {
						$show_in_cattool=0;
					}

					$source		   = mysql_real_escape_string($xliff_trans_unit['source']['raw-content']);
                                        $num_words 	   = CatUtils::segment_raw_wordcount($xliff_trans_unit['source']['raw-content']);
					$trans_unit_id     = mysql_real_escape_string($xliff_trans_unit['attr']['id']);
					$query_segment   = "('$trans_unit_id',$fid,'$source',$num_words,NULL,NULL,NULL,$show_in_cattool)";
				}
                                $ret = true;
                                // Executing the Query
                                $query_segment = "INSERT INTO segments (internal_id,id_file, segment, raw_word_count, xliff_mrk_id, xliff_ext_prec_tags, xliff_ext_succ_tags, show_in_cattool)
                             values ".$query_segment;
                                //log::doLog($query_segment); //exit;

                                $res = mysql_query($query_segment, $mysql_link);

                                if (!$res) {
                                    log::doLog("File import - DB Error: " . mysql_error() . " - $query_segment\n");
                                    $ret = false;
                                }

                                if (isset($xliff_trans_unit['target'])) {

                                    $target = mysql_real_escape_string($xliff_trans_unit['target']['raw-content']);
                                    //log::doLog("Target: ".$target);

                                    if (!empty($target)){



                                        $last_id = mysql_insert_id($mysql_link);
                                        //log::doLog("Last_id: ".$last_id);
                                        $query_segment_translations = "('$last_id', '$jid','TRANSLATED','$target',NULL,NULL,NULL,NULL, NULL, NULL, '$target',NULL,NULL,NULL)";

                                        
                                        // Executing the Query
                                        $query_segment_translations = "INSERT INTO segment_translations (id_segment, id_job,status, translation, translation_date, time_to_edit, match_type, context_hash, eq_word_count, suggestions_array, suggestion, suggestion_match, suggestion_source, suggestion_position)
                                 values ".$query_segment_translations;
                                        //log::doLog($query_segment_translations);
                                        $res2 = mysql_query($query_segment_translations, $mysql_link);
                                        if (!$res2) {
                                            log::doLog("File import - DB Error: " . mysql_error() . " - $query_segment_translations\n");
                                            $ret = false;

                                        }

                                    }
                                }

                        }
		}
	}





    return $ret;
}

    function stripTagsFromSource2($text) {
        //       echo "<pre>";
        $pattern_g_o = '|(<.*?>)|';
        $pattern_g_c = '|(</.*?>)|';
        $pattern_x = '|(<.*?/>)|';

        // echo "first  -->  $text \n";
        $text = preg_replace($pattern_x, "", $text);
        // echo "after1  --> $text\n";

        $text = preg_replace($pattern_g_o, "", $text);
        //  echo "after2  -->  $text \n";
//
        $text = preg_replace($pattern_g_c, "", $text);
        $text= str_replace ("&nbsp;", " ", $text);
        return $text;
    }

?>
