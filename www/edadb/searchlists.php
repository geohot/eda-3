<?php
require_once('thrift.php');
require_once('base.php');

$jsonInput = file_get_contents('php://input');
$data = json_decode($jsonInput);


$searchdata = array();

foreach ($data as $key => $value) {
  $searchdata[hexdec($key)] = chr($value);
}

$transport->open();
$cllist = $client->getMatchingList($commitdata);
$transport->close();

echo(json_encode($cllist));

