<!DOCTYPE html>
<html>
<head>
  <title>Withdraw</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

<div class="container">

  <div class="sidebar">
    <h2>PocketTrading</h2>
  </div>

  <div class="main">

    <div class="card">
      <h3>Withdraw Funds</h3>

      <input id="amount" placeholder="Amount ($)">
      <input id="wallet" placeholder="Your Wallet Address">

      <button class="btn" onclick="requestWithdraw()">Request Withdrawal</button>
    </div>

  </div>

</div>

<script type="module" src="js/withdraw.js"></script>
</body>
</html>
