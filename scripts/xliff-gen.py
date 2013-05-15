#! /usr/bin/env python
# -*- coding: utf-8 -*-

import sys, traceback, os, re, getopt
import datetime, time
import random, math, codecs, copy
import collections
from xml.sax.saxutils import escape
try: import simplejson as json
except ImportError: import json


from casmacat import *
#from numpy.testing.utils import elapsed

def usage():
  print >> sys.stderr, sys.argv[0], "help", "config=", "detokenize", "source-language=", "target-language=", "filter=", "xliff="


if __name__ == "__main__":
  from sys import argv
  import logging
  import atexit

  try:
    opts, args = getopt.getopt(sys.argv[1:], "hc:ds:t:f:x:", ["help", "config=", "detokenize", "source-language=", "target-language=", "filter=", "xliff="])
  except getopt.GetoptError as err:
    # print help information and exit:
    print str(err) # will print something like "option -a not recognized"
    usage()
    sys.exit(2)
  config_fn = None
  verbose   = False
  tokenize  = True
  source_language = "en"
  target_language = "es"
  filter_sentences = None
  xliff_fn = None
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
    elif o in ("-d", "--detokenize"):
      tokenize = False
    else:
      assert False, "unhandled option"


  assert config_fn, "config file required"

  config = json.load(open(config_fn))

  tokenizer_plugin = TextProcessorPlugin(config["text-processor"]["module"], config["text-processor"]["parameters"])
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
        sentences.append((n, line_tok))

        if line_detok != line:
          print "original:", line
          print "produced:", line_detok
          print "result:", line_tok
          wrong += 1
          #raise Exception("Wrong tokenization")

      else:
        line = tuple(line.split())
        line_detok, _ = tokenizer.postprocess(line)
        line_tok, _   = tokenizer.preprocess(line_detok)
        sentences.append((n, line_detok))

        if line_tok != line:
          print "original:", line
          print "produced:", line_tok
          print "result:", line_detok
          wrong += 1
          #raise Exception("Wrong detokenization")
      n += 1

  
  print "%d incompatibilities found" % wrong

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
    sentence_tmpl = """        <trans-unit id="%d" restype="label" resname="ID1%d"><source>%s</source></trans-unit>"""

    print >> fd, xliff_tmpl % (source_language, target_language, "\n".join([ sentence_tmpl % (i, i, escape(s.strip())) for i, s in sentences]))
    fd.close()
