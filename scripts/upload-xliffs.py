#! /usr/bin/env python

import sys, requests, json
from xml.dom.minidom import parse
from os.path import basename

n_expected_args = 2
n_received_args = len(sys.argv[1:])

if (n_received_args < n_expected_args):
  sys.exit("Usage: %s userID file.xlif[,file2.xliff,...]" % sys.argv[0])

user_id     = sys.argv[1]
xliff_files = sys.argv[2:]

# Helper function to assign unique filenames
def fnam(f):
  return user_id + "-" + basename(f)

# Read target & tource langs
dom = parse(open(xliff_files[0], 'r'))
root_node = dom.documentElement
file_node = root_node.getElementsByTagName('file')[0]

try:
  src_lang = file_node.getAttributeNode('source-language').nodeValue
except:
  sys.exit("No source language found in XLIFF")
try:
  tgt_lang = file_node.getAttributeNode('target-language').nodeValue
except:
  sys.exit("No target language found in XLIFF")

# Matecat server URL
url = 'http://casmacat.iti.upv.es/matecat-test/'

session = requests.session()
# Init session first
r = session.get(url)
# Then post data
for x in xliff_files:
  ufnam = fnam(x)
  files = { 'files[]': (ufnam, open(x, 'r')) }
  r = session.post(url + 'lib/utils/fileupload/', files=files)
  j = json.loads(r.text)
  print "Uploading %s at %s" % (ufnam, j[0]['guid'])
  num_src_segments = len(file_node.getElementsByTagName('source'))
  print "FYI, this XLIFF has %d segments" % num_src_segments

file_names = ",".join(map(fnam, xliff_files))
# This object is sent via ajax to `url` from Matecat
data = {
         'action': "createProject",
      'file_name': file_names,
   'project_name': user_id,
'source_language': src_lang,
'target_language': tgt_lang,
     'tms_engine': "",
      'mt_engine': ""
}

r = session.post(url, data=data)
j = json.loads(r.text)

trans_url = "translate/%(project_name)s/%(source_language)s-%(target_language)s/%(id_job)s-%(password)s" % j
print 
print url + trans_url
print
