from flask import Flask
app = Flask(__name__)


@app.route('/<path:path>')
def file():
  open("../www/"+path, "r")


