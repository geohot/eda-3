<?php
require_once('thrift.php');

$transport->open();
$tags = $client->getTags($_GET['addr']);
$transport->close();

echo(json_encode($tags));

