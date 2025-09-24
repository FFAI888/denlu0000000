<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>管理后台 - RongChain DApp</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .hidden { display: none; }
    ul { padding-left: 20px; }
    li { margin: 5px 0; }
    button { margin-left: 10px; }
    input { padding: 5px; width: 300px; }
    #logs { margin-top: 20px; padding: 10px; border: 1px solid #ccc; background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>RongChain 管理后台</h1>

  <div id="notice">正在检测权限...</div>

  <div id="adminPanel" class="hidden">
    <h2>白名单地址管理</h2>
    <input type="text" id="newAddress" placeholder="输入钱包地址">
    <button onclick="addWhitelist()">添加</button>

    <h2>白名单操作记录</h2>
    <div id="logs">加载中...</div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
  <script src="admin.js"></script>
</body>
</html>
