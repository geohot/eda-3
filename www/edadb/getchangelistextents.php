<?php
require_once('thrift.php');
require_once('base.php');

$transport->open();
$clnumber = (int)$_GET['n'];
$wdata = $client->getChangelistWrittenExtents($clnumber);
$transport->close();

$ret = array();

foreach ($wdata as $addr => $data) {
  $ret[shex($addr)] = strlen($data);
}

echo json_encode($ret);

