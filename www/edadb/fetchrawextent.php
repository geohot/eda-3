<?php
require_once('thrift.php');

$transport->open();
$extents = $client->fetchExtents( array($_GET['addr'] => $_GET['size']), $_GET['changenumber'], false);
$transport->close();

//print_r($extents);
header('Content-Type: binary/octet-stream');
//header("Content-Transfer-Encoding: binary");
//print_r($extents);
echo $extents[$_GET['addr']];

