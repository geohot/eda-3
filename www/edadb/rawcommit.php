<?php
require_once('thrift.php');

$rawdata = file_get_contents('php://input');

$commitdata[$_GET['addr']] = $rawdata;

$transport->open();
$clnumber = $client->commitExtents($commitdata);
$transport->close();

echo($clnumber);
