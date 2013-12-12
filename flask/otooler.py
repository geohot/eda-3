import subprocess

otool = '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/usr/bin/otool'

def parse_file(fn):
  p = subprocess.Popen([otool, '-tv', fn], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  out, err = p.communicate()
  return out

if __name__ == "__main__":
  otool_out = parse_file("/Users/geohot/iphone/test_eda/a.out").split("\n")
  

