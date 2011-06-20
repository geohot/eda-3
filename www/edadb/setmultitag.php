<?php
require_once('thrift.php');

$tagsdata = json_decode(file_get_contents('php://input'));

$transport->open();
foreach ($tagsdata as $addr => $obj) {
  foreach ($obj as $tagname => $tagdata) {
    $client->setTag($addr, $tagname, $tagdata);
  }
}
$transport->close();

