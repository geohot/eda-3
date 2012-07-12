<?php
require_once('thrift.php');

$transport->open();
$tags = $client->getReaderList($_GET['addr']);
$transport->close();

echo(json_encode($tags));

