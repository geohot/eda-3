<?php
require_once('thrift.php');

$handle = fopen('php://input','r');
$jsonInput = fgets($handle);
fclose($handle);
$data = json_decode($jsonInput);

$commitdata = array();

foreach ($data as $key => $value) {
  $commitdata[hexdec($key)] = chr($value);
}

$transport->open();
$clnumber = $client->commitExtents($commitdata);
$transport->close();

echo($clnumber);

