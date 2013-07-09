/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


 
            $(document).ready(function() {

                $('#documentList').dataTable( {
                    'bProcessing': true,
                    'bServerSide': true,
                    'sPaginationType': 'full_numbers',
                    'bStateSave': false,
                    'sAjaxSource': config.basepath+'/index.php?action=generateList'
                } );
            } );
            var jobid = null;
            var password = null;
            var selectedDoc = null;
            var selectedAssignment = null;
            $('#documentList tbody tr').live('click', function(e) {

                if ( $(this).hasClass('rowSelected') ) {
                    $(this).removeClass('rowSelected');
                    fileid = null;
                    jobid = null;
                    password = null;
                    filename = null;
                    srclang = null;
                    selectedDoc = null;
                    selectedAssignment = null;
                                        
                    $('#startTranslation').attr('disabled', true);
                    $('#replay').attr('disabled', true);
                    $('#download').attr('disabled', true);
                    //$('#downloadForm input[id=download]').attr('disabled','disabled');
                    //$('#deleteDocForm input[id=deleteDoc]').attr('disabled','disabled');
                }
                else {
                    $(selectedDoc).parent('tr').removeClass('rowSelected');
                    $(this).addClass('rowSelected');
                    selectedAssignment = $(this).find('td');
                    selectedDoc = $(this).find('td').next();
                    fileid = $(this).find('td').get(0).textContent;
                    filename = $(this).find('td').get(1).textContent;
                    srclang = $(this).find('td').get(2).textContent;
                    jobid = $(this).find('td').get(4).textContent;
                    password = $(this).find('td').get(5).textContent;
                    /*$("#downloadForm input[name=jobid]").val(jobid);
                    $("#downloadForm input[name=fileid]").val(fileid);
                    $("#downloadForm input[name=filename]").val(filename);
                    $("#downloadForm input[name=srclang]").val(srclang);*/

                    $('#startTranslation').attr('disabled', false);
                    $('#replay').attr('disabled', false);
                    $('#download').attr('disabled', false);
                    //$('#downloadForm input[id=download]').attr('disabled',false);
                    //$('#deleteDocForm input[id=deleteDoc]').attr('disabled', false);
                } }
        );
            function startTranslation() {
                //window.location.href = config.basepath+'?action=translate&jid='+jobid+'&password='+password;
                window.location.href = config.basepath+'translate/'+filename+'/'+srclang+'/'+jobid+'-'+password;
       
            }
            
            function replay(){
                
                window.location.href = config.basepath+'?action=replay&jid='+jobid+'&password='+password;
                        //replay/'+filename+'/'+srclang+'/'+jobid+'-'+password;
                
            }
            
            function download() {
                var data = {
                    action: "createLogDownload",
                    fileid: fileid,
                    jobid: jobid,
                   
                };
                $.ajax({
                    url:config.basepath + 'index.php?action=createLogDownload',
                    data: data,
                    type: "POST",
                    dataType: "json",
                    cache: false,
                    
                   
                    success: function(result) {
                                                
                        if (result.data && result.data === "OK") {
                            alert("Executing export log file");
                        }
                        else if (result.errors) {    
                            alert("Server error");
                        }
                    },
                    
                    error: function(request, status, error) {

                        alert("Error': '" + error + "'");
                        
                    }
                 
                });

            }

