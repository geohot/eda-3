<?php
require_once('thrift.php');
require_once('base.php');

$transport->open();
$clnumber = (int)$_GET['n'];
$wdata = $client->getChangelistWrittenExtents($clnumber);
$rdata = $client->getChangelistReadExtents($clnumber);
$transport->close();

echo '<html><head>';
echo '<link rel="stylesheet" type="text/css" href="/eda/xvi/xvi.css" />';
echo '<title>Changelist '.$clnumber.'</title>';
echo '</head><body><table>';

// confused why these are broken into singles
foreach ($wdata as $addr => $data) {
  echo '<tr>';
  echo '<td>0x'.shex($addr).'</td>';
  echo '<td>W</td>';
  echo '<td>'.hexdump($data).'</td>';
  echo '</tr>';
}


echo '</table></body></html>';

