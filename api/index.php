<?php
declare(strict_types=1);

// PocketTrading API foundation. All secrets are read from server environment variables.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('pockettrading_session');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$isHttps,'httponly'=>true,'samesite'=>'Lax']);
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

function respond(int $status, array $body): never { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_SLASHES); exit; }
function body(): array { $raw=file_get_contents('php://input'); if (!$raw) return []; $data=json_decode($raw,true); if (!is_array($data)) respond(400,['ok'=>false,'error'=>'Invalid JSON body']); return $data; }
function db(): PDO {
  static $pdo=null; if ($pdo instanceof PDO) return $pdo;
  $host=getenv('MYSQLHOST') ?: getenv('DB_HOST'); $port=getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: '3306';
  $name=getenv('MYSQLDATABASE') ?: getenv('DB_NAME'); $user=getenv('MYSQLUSER') ?: getenv('DB_USER'); $pass=getenv('MYSQLPASSWORD') ?: getenv('DB_PASSWORD');
  if (!$host || !$name || !$user || $pass===false || $pass==='') respond(503,['ok'=>false,'error'=>'Database environment variables are not configured']);
  $pdo=new PDO("mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
  return $pdo;
}
function inputString(array $d,string $key,int $max=255): string { $v=$d[$key]??''; if(!is_string($v)) return ''; $v=trim($v); return mb_substr($v,0,$max); }
function currentUser(PDO $pdo): array {
  $id=$_SESSION['user_id']??null; if(!$id) respond(401,['ok'=>false,'error'=>'Please sign in']);
  $q=$pdo->prepare('SELECT id,email,full_name,balance,kyc_status,is_admin,created_at FROM custom_users WHERE id=? LIMIT 1'); $q->execute([$id]); $u=$q->fetch();
  if(!$u){session_destroy();respond(401,['ok'=>false,'error'=>'Session expired']);} return $u;
}
function adminOnly(array $u): void { if (strtolower((string)$u['email']) !== 'ephremgojo@gmail.com') respond(403,['ok'=>false,'error'=>'Administrator access required']); }
$action=$_GET['action']??''; $method=$_SERVER['REQUEST_METHOD']??'GET';
try {
  if ($action==='health') {
    $pdo=db(); $pdo->query('SELECT 1'); respond(200,['ok'=>true,'service'=>'PocketTrading API','database'=>'connected']);
  }
  $pdo=db();
  if ($action==='auth/register' && $method==='POST') {
    $d=body(); $name=inputString($d,'full_name',100); $email=strtolower(inputString($d,'email',190)); $password=$d['password']??'';
    if($name==='' || !filter_var($email,FILTER_VALIDATE_EMAIL) || !is_string($password) || strlen($password)<10) respond(422,['ok'=>false,'error'=>'Enter a name, valid email, and password with at least 10 characters']);
    $q=$pdo->prepare('SELECT id FROM custom_users WHERE email=? LIMIT 1');$q->execute([$email]);if($q->fetch())respond(409,['ok'=>false,'error'=>'An account with this email already exists']);
    $q=$pdo->prepare('INSERT INTO custom_users (email,full_name,password_hash,balance,kyc_status,is_admin,created_at) VALUES (?,?,?,0,\'pending\',0,NOW())');
    $q->execute([$email,$name,password_hash($password,PASSWORD_DEFAULT)]);$id=(int)$pdo->lastInsertId();session_regenerate_id(true);$_SESSION['user_id']=$id;
    respond(201,['ok'=>true,'user'=>['id'=>$id,'email'=>$email,'full_name'=>$name,'balance'=>0,'kyc_status'=>'pending','is_admin'=>false]]);
  }
  if ($action==='auth/login' && $method==='POST') {
    $d=body();$email=strtolower(inputString($d,'email',190));$password=$d['password']??'';
    if(!filter_var($email,FILTER_VALIDATE_EMAIL)||!is_string($password))respond(422,['ok'=>false,'error'=>'Email and password are required']);
    $q=$pdo->prepare('SELECT id,email,full_name,password_hash,balance,kyc_status,is_admin,created_at FROM custom_users WHERE email=? LIMIT 1');$q->execute([$email]);$u=$q->fetch();
    if(!$u || !password_verify($password,(string)$u['password_hash'])) respond(401,['ok'=>false,'error'=>'Invalid email or password']);
    session_regenerate_id(true);$_SESSION['user_id']=(int)$u['id'];$isAdmin=strtolower($u['email'])==='ephremgojo@gmail.com';
    unset($u['password_hash']);$u['is_admin']=$isAdmin;respond(200,['ok'=>true,'user'=>$u]);
  }
  if ($action==='auth/me') { $u=currentUser($pdo);$u['is_admin']=strtolower($u['email'])==='ephremgojo@gmail.com';respond(200,['ok'=>true,'user'=>$u]); }
  if ($action==='auth/logout' && $method==='POST') { $_SESSION=[]; if(ini_get('session.use_cookies')){$p=session_get_cookie_params();setcookie(session_name(),'',['expires'=>time()-42000,'path'=>$p['path'],'domain'=>$p['domain'],'secure'=>$p['secure'],'httponly'=>$p['httponly'],'samesite'=>'Lax']);}session_destroy();respond(200,['ok'=>true]); }
  if ($action==='profile/update' && $method==='POST') {
    $u=currentUser($pdo);$d=body();$name=inputString($d,'full_name',100);if($name==='')respond(422,['ok'=>false,'error'=>'Name is required']);
    $q=$pdo->prepare('UPDATE custom_users SET full_name=? WHERE id=?');$q->execute([$name,$u['id']]);$u['full_name']=$name;respond(200,['ok'=>true,'user'=>$u]);
  }
  if ($action==='trade/create' && $method==='POST') {
    $u=currentUser($pdo);$d=body();$symbol=strtoupper(inputString($d,'symbol',20));$type=strtolower(inputString($d,'type',10));$duration=(int)($d['duration']??0);$amount=filter_var($d['amount']??null,FILTER_VALIDATE_FLOAT);$price=filter_var($d['entry_price']??null,FILTER_VALIDATE_FLOAT);
    $rules=[30=>['payout'=>12,'min'=>100,'max'=>10000],60=>['payout'=>18,'min'=>15000,'max'=>45000],90=>['payout'=>25,'min'=>50000,'max'=>120000],120=>['payout'=>30,'min'=>200000,'max'=>350000],180=>['payout'=>35,'min'=>500000,'max'=>750000],300=>['payout'=>45,'min'=>1000000,'max'=>1300000]];
    if(!isset($rules[$duration])||!in_array($type,['buy','sell'],true)||!preg_match('/^[A-Z0-9]{2,20}$/',$symbol)||$amount===false||!is_finite((float)$amount)||$price===false||!is_finite((float)$price)||$price<=0)respond(422,['ok'=>false,'error'=>'Invalid trade details']);
    $r=$rules[$duration];if($amount<$r['min']||$amount>$r['max'])respond(422,['ok'=>false,'error'=>'Trade amount is outside the selected duration limits']);
    $fee=round($amount*0.02,2);$total=round($amount+$fee,2);$pdo->beginTransaction();
    try{$lock=$pdo->prepare('SELECT balance FROM custom_users WHERE id=? FOR UPDATE');$lock->execute([$u['id']]);$balance=(float)$lock->fetchColumn();if($balance<$total){$pdo->rollBack();respond(422,['ok'=>false,'error'=>'Insufficient balance including the 2% fee']);}
      $pdo->prepare('UPDATE custom_users SET balance=balance-? WHERE id=?')->execute([$total,$u['id']]);
      $pdo->prepare('INSERT INTO trades (user_id,symbol,type,amount,leverage,entry_price,fee,status,duration,payout_percent,expected_payout,created_at) VALUES (?,?,?,?,1,?,?,\'open\',?,?,?,NOW())')->execute([$u['id'],$symbol,$type,$amount,$price,$fee,$duration,$r['payout'],$amount*(1+$r['payout']/100)]);
      $tradeId=(int)$pdo->lastInsertId();$pdo->prepare('INSERT INTO transactions (user_id,amount,type,description,date) VALUES (?,?,?, ?,NOW())')->execute([$u['id'],-$total,'trade_open',"Trade {$type} {$symbol}; amount {$amount}; fee {$fee}"]);$pdo->commit();
      respond(201,['ok'=>true,'trade'=>['id'=>$tradeId,'user_id'=>(int)$u['id'],'symbol'=>$symbol,'type'=>$type,'amount'=>(float)$amount,'entry_price'=>(float)$price,'fee'=>$fee,'status'=>'open','duration'=>$duration,'payout_percent'=>$r['payout'],'expected_payout'=>$amount*(1+$r['payout']/100)],'balance'=>round($balance-$total,2),'notice'=>'Trade recorded. This foundation does not settle trades; settlement must be implemented and verified separately.']);
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
  }
  if ($action==='trade/list') { $u=currentUser($pdo);$q=$pdo->prepare('SELECT * FROM trades WHERE user_id=? ORDER BY created_at DESC LIMIT 500');$q->execute([$u['id']]);respond(200,['ok'=>true,'trades'=>$q->fetchAll()]); }
  if ($action==='admin/users') { $u=currentUser($pdo);adminOnly($u);$q=$pdo->query('SELECT id,email,full_name,balance,kyc_status,is_admin,created_at FROM custom_users ORDER BY created_at DESC LIMIT 1000');respond(200,['ok'=>true,'users'=>$q->fetchAll()]); }
  respond(404,['ok'=>false,'error'=>'Unknown API action']);
} catch (Throwable $e) {
  error_log('PocketTrading API error: '.$e->getMessage());
  respond(500,['ok'=>false,'error'=>'Server error. Check Vercel function logs.']);
}
