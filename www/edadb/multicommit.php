<?php
require_once('thrift.php');

$jsonInput = file_get_contents('php://input');
$data = json_decode($jsonInput);
$clnumbers = array();

$transport->open();

foreach ($data as $onecommit) {
  $commitdata = array();
  foreach ($onecommit as $key => $value) {
    $commitdata[hexdec($key)] = chr($value);
  }
  $clnumbers[] = $client->commitExtents($commitdata);
}

$transport->close();

echo(json_encode($clnumbers));

