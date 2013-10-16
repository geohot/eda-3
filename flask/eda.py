from flask import request
from flask import Response
from flask import Flask
import hashlib
#import parse
import sys
import os
import json
import signal
import pickle
import mutex
app = Flask(__name__)

class Tags:
  def __init__(self):
    self.data = {}
  def __getitem__(self, k):
    if k not in self.data:
      self.data[k] = {}
    return self.data[k]

daddr = {}
tags = Tags()
cl = 0
prj_name = ""

"""
@app.route('/upload.py', methods=["POST"])
def upload():
  global prj_name
  f = request.files['the_file']
  d = f.read()
  prj_name = f.filename+"_"+hashlib.sha1(d).hexdigest()
  ff = open("../tmp/uploads/"+prj_name, "wb")
  ff.write(d)
  ff.close()
  ff = open("../tmp/uploads/"+prj_name, "rb")
  return parse.go(ff, daddr, tags)
"""

@app.route('/')
def homepage():
  return open("homepage.html").read()

@app.route('/eda/graph/dot.php', methods=["POST"])
def graph_dot():
  f = open("/tmp/in.dot", "w")
  f.write(request.data)
  f.close()
  os.system("dot /tmp/in.dot > /tmp/out.dot")
  return open("/tmp/out.dot").read()

@app.route('/eda/isdf/loadiset.php')
def isdf_loadiset():
  print request.args
  return open("../isdf/"+request.args['iset']+".isdf2").read()

@app.route('/eda/isdf/saveiset.php', methods=["POST"])
def isdf_saveiset():
  iset = request.data.split('"iset":"')[1].split('"')[0]
  print "saving",iset
  f = open("../isdf/"+iset+".isdf2", "w")
  f.write(request.data)
  f.close()
  return ""
  
  #return open("../isdf/"+request.args['iset']+".isdf2").read()

@app.route('/eda/edadb/getmultitag.php')
def edadb_getmultitag():
  global cl, tags
  addr = int(request.args['addr'])
  l = int(request.args['len'])
  ret = {}
  for i in range(addr, addr+l):
    ret[i] = tags[i]
  return json.dumps(ret)

@app.route('/eda/edadb/searchtagsbyname.php')
def edadb_searchtagsbyname():
  global tags
  tagname = request.args['tagname']
  ret = {}
  for t in tags.data:
    if tagname in tags[t]:
      ret[t] = t
  return json.dumps(ret)

@app.route('/eda/edadb/searchtags.php')
def edadb_searchtags():
  global tags
  tagname = request.args['tagname']
  data = request.args['data']
  ret = {}
  for t in tags.data:
    if tagname in tags[t] and tags[t][tagname] == data:
      ret[t] = t
  return json.dumps(ret)

@app.route('/eda/edadb/fetchrawextent.php')
def edadb_fetchrawextent():
  global cl, tags, daddr
  #print request.args
  ret = []
  addr = int(request.args['addr'])
  l = int(request.args['size'])
  for i in range(addr, addr+l):
    if i in daddr:
      ret.append(chr(daddr[i]))
    else:
      ret.append("\xAA")
  return ''.join(ret)

@app.route('/eda/edadb/maxchangelist.php')
def edadb_maxchangelist():
  global cl, tags
  return str(cl)

@app.route('/eda/edadb/rawcommit.php', methods=["POST"])
def edadb_rawcommit():
  global cl, tags, daddr
  cl += 1
  dat = request.data
  addr = int(request.args['addr'])
  for i in range(addr, addr+len(dat)):
    daddr[i] = ord(dat[i-addr])
  return str(cl)

@app.route('/eda/edadb/commit.php', methods=["POST"])
def edadb_commit():
  global cl, tags, daddr
  cl += 1
  j = json.loads(request.data)
  for a in j:
    #print j[a]
    daddr[int(a, 16)] = j[a]
  return str(cl)

@app.route('/eda/edadb/setmultitag.php', methods=["POST"])
def edadb_setmultitag():
  global cl, tags
  j = json.loads(request.data)
  for a in j:
    for t in j[a]:
      tags[int(a)][t] = str(j[a][t])
  return ""
  
@app.route('/eda/edadb/settag.php', methods=["POST"])
def edadb_settag():
  global cl, tags
  addr = int(request.args['addr'])
  if request.data == "":
    if request.args['tagname'] in tags[int(addr)]:
      tags[int(addr)].__delitem__(request.args['tagname'])
  else:
    tags[int(addr)][request.args['tagname']] = request.data
  return ""

@app.route('/eda/edadb/getreaderlist.php')
def edadb_getreaderlist():
  return "{}"

@app.route('/eda/edadb/gettags.php')
def edadb_gettags():
  global cl, tags
  return json.dumps(tags[int(request.args['addr'])])

@app.route('/eda/edadb/<path:path>')
def edadb_unimplemented(path):
  print path,"unimplemented"
  return ""

@app.route('/eda/<path:path>')
def file(path):
  path = "../www/"+path
  """
  if os.path.isdir(path):
    path += "/index.html"
  """
  dat = open(path, "r").read()
  if path[-3:] == ".js":
    return Response(dat, mimetype='text/javascript')
  if path[-4:] == ".css":
    return Response(dat, mimetype='text/css')
  return dat

db_file = "../tmp/tmp.db"
did_save = mutex.mutex()

def save():
  print "saving shit"
  f = open(db_file, "wb")
  pickle.dump((daddr, tags, cl), f)
  f.close()
  print "saved"

def manhandle(signal, frame):
  global did_save, db_file
  #did_save.lock(save, 0)
  if frame.f_lasti == 202:
    print signal, frame.f_lasti, cl
    save()
  sys.exit(0)

if __name__ == "__main__":
  if os.path.exists(db_file):
    f = open(db_file, "rb")
    (daddr, tags, cl) = pickle.load(f)
    f.close()
  signal.signal(signal.SIGINT, manhandle)
  app.debug = True
  #app.run(host='0.0.0.0')
  app.run()

