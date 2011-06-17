<?php
require_once('thrift.php');

$jsonInput = file_get_contents('php://input');
$data = json_decode($jsonInput);

$commitdata = array();

foreach ($data as $key => $value) {
  $commitdata[hexdec($key)] = chr($value);
}

$transport->open();
$clnumber = $client->commitExtents($commitdata);
$transport->close();

echo($clnumber);

