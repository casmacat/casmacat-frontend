#! /usr/bin/env python
# -*- coding: utf-8 -*-

import sys, traceback, os, re, getopt
import datetime, time
import random, math, codecs, copy
import collections
from xml.sax.saxutils import escape
try: import simplejson as json
except ImportError: import json

opts_shortcuts = "vhc:dos:t:f:x:b:"
opts_longcuts  = ["help", "config=", "detokenize", "overwrite-tokens", "source-language=", "target-language=", "filter=", "xliff=", "basepath="]

def usage():
  print "%s %s" % (sys.argv[0],  ", ".join(opts_longcuts))

if __name__ == "__main__":
  from sys import argv
  import logging
  import atexit

  try:
    opts, args = getopt.getopt(sys.argv[1:], opts_shortcuts, opts_longcuts)
  except getopt.GetoptError as err:
    print str(err) # will print something like "option -a not recognized"
    usage()
    sys.exit(2)
  
  config_fn = None
  verbose   = False
  tokenize  = True
  overwrite_tokens = False
  source_language = "en"
  target_language = "es"
  filter_sentences = None
  xliff_fn = None
  basepath = "/home/demo/software/casmacat-server-library/server"
  for o, a in opts:
    if o == "-v":
      verbose = True
    elif o in ("-h", "--help"):
      usage()
      sys.exit()
    elif o in ("-s", "--source-language"):
      source_language = a
    elif o in ("-t", "--target-language"):
      target_language = a
    elif o in ("-c", "--config"):
      config_fn = a
    elif o in ("-f", "--filter"):
      filter_sentences = a
    elif o in ("-x", "--xliff"):
      xliff_fn = a
    elif o in ("-b", "--basepath"):
      basepath = a
    elif o in ("-d", "--detokenize"):
      tokenize = False
    elif o in ("-d", "--overwrite-tokens"):
      overwrite_tokens = True
    else:
      assert False, "unhandled option"

  sys.path.append(basepath)
  from casmacat import *
  
  assert config_fn, "config file required" 
  if not config_fn.startswith('/'): 
    config_fn = basepath + '/' + config_fn
  config = json.load(open(config_fn))

  def log(*args):
    if verbose:
      print " ".join(args)
  
  tokenizer_plugin = TextProcessorPlugin(config["source-processor"]["module"], config["source-processor"]["parameters"])
  tokenizer_factory = tokenizer_plugin.create()
  assert tokenizer_factory, "Tokenizer plugin failed"
  tokenizer = tokenizer_factory.createInstance()
  assert tokenizer, "Tokenizer instance failed"

  wrong = 0
  sentences = []
  n = 1
  for fn in args:
    for line in open(fn):
      line = line.strip()

      if tokenize:
        line_tok, _   = tokenizer.preprocess(line)
        line_detok, _ = tokenizer.postprocess(line_tok)
        entry = line_tok

        if line_detok != line:
          log("original:", line)
          log("produced:", line_detok)
#          log("result:", line_tok)
          wrong += 1
          #raise Exception("Wrong tokenization")
          if overwrite_tokens:
            entry, _ = tokenizer.preprocess(line_detok)
            log("overwritten:", entry)
          log("-" * 60)
          
      else:
        line = tuple(line.split())
        line_detok, _ = tokenizer.postprocess(line)
        line_tok, _   = tokenizer.preprocess(line_detok)
        entry = line_detok

        if line_tok != line:  
          log("original:", line)
          log("produced:", line_detok)
#          log("result:", line_tok)
          wrong += 1
          #raise Exception("Wrong detokenization")
          if overwrite_tokens:
            entry, _ = tokenizer.postprocess(line_tok)
            log("overwritten:", entry)
          log("-" * 60)
          
      sentences.append((n, entry))
      n += 1

  log("%d incompatibilities found" % wrong)
  
  if filter_sentences:
    re_num = re.compile("^(\d+)$")
    re_range = re.compile("^(\d+)-(\d+)$")
    def parse_filt(n):
      if re_num.match(n):
        return [ int(n) - 1 ]
      m = re_range.match(n)
      if m:
        return range(int(m.group(1)) - 1, int(m.group(2)))
      return None

    filter_sentences = set(sum([ parse_filt(n) for n in filter_sentences.split(",") ], []))
    sentences = [ sentences[i] for i in range(len(sentences)) if i in filter_sentences ]

  separator = " " if tokenize else ""

  if xliff_fn:
    fd = open(xliff_fn, "w")
    xliff_tmpl = """<?xml version="1.0" encoding="utf-8" ?>
<xliff version="1.1" xml:lang='en'>
  <file source-language='%s' target-language='%s' datatype="winres" original="Sample1.rc">
    <header>
      <skl><external-file href="Sample1.rc.skl"/></skl>
    </header>
    <body>
      <group restype="dialog" resname="DIALOG">
%s
      </group>
    </body>
  </file>
</xliff>
"""
    sentence_tmpl = """        <trans-unit id="%d" restype="label" resname="ID%d"><source>%s</source></trans-unit>"""
    print >> fd, xliff_tmpl % (source_language, target_language, "\n".join([ sentence_tmpl % (i, i, escape(separator.join(s))) for i, s in sentences ]))
    fd.close()
  else:
    print "\n".join([ separator.join(s) for i, s in sentences ])
    
