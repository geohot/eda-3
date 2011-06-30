<?php
require_once('thrift.php');

$transport->open();
$tags = Array();

for ($i = $_GET['addr']; $i < $_GET['addr']+$_GET['len']; $i++) {
  $tags[$i] = $client->getTags($i);
}
$transport->close();

echo(json_encode($tags));

