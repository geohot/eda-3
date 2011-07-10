function Graph() {
  var nodes = {};
}

// keys must be strings
Graph.prototype.addNode = function(key, value) {
  nodes[key] = value;
};

Graph.prototype.getNodeByKey = function(key) {
  return nodes[key];
};

Graph.prototype.addEdge = function(n1, n2) {

};

