<?php

$data = file_get_contents('php://input');

if (strlen($data) == 0) {
?>
<html>
<head><script>
function submit() {
  var data = document.getElementById("data").value;

  var req = new XMLHttpRequest();
  req.open('POST', '#', false);
  req.send(data);

  document.getElementById("out").value = req.response;
}
</script></head>
<body>
  <table><tr><td>
  <textarea id="data" rows=40 cols=40></textarea>
  </td><td>
  <textarea id="out" rows=40 cols=120></textarea><br/>
  </td></tr></table>
  <input type="button" onclick="submit();" value="submit" />
</body>
</html>
<?php
}


file_put_contents('/tmp/in.dot', $data);

system('dot /tmp/in.dot');
#system('dot /tmp/in.dot -Tgif > /tmp/out.gif');


