# Node.js 入门指南

## 一句话理解 Node.js

**Node.js = C++ 写的程序 + JavaScript 语法**

它让你能用 JavaScript 写命令行工具、写服务器、操作文件、访问网络等。

---

## 浏览器 JavaScript vs Node.js

| 能力 | 浏览器 | Node.js |
|------|--------|---------|
| 操作 DOM | ✅ | ❌（没有浏览器） |
| 读写文件 | ❌ | ✅ |
| 访问网络（发送请求） | ✅ | ✅ |
| 操作系统信息 | ❌ | ✅ |
| 命令行参数 | ❌ | ✅ |
| TCP/UDP 通信 | ❌ | ✅ |
| 创建 WebSocket | 受限 | ✅ |

**本质区别**：浏览器有 `window`、`document`，Node.js 有 `fs`、`os`、`http`、`path` 等系统级 API。

---

## Node.js 能做什么

1. **Web 服务器**（Express/Koa/Egg/Nest）
2. **命令行工具**（npm scripts、webpack、vite）
3. **构建工具**（打包、编译、代码检查）
4. **脚本自动化**（文件处理、数据转换）
5. **桌面应用**（Electron）
6. **微服务**（GraphQL、gRPC）
7. **IoT**（树莓派控制）

---

## 核心概念

### 1. 模块系统（Module）

Node.js 使用 CommonJS 模块规范。

```javascript
// 导出
// math.js
const add = (a, b) => a + b;
const multiply = (a, b) => a * b;
module.exports = { add, multiply };

// 导入
// app.js
const { add, multiply } = require('./math');
console.log(add(1, 2));  // 3
```

**ES Module（新版）**：
```javascript
// math.mjs
export const add = (a, b) => a + b;
export default { add };

// app.mjs
import { add } from './math.mjs';
import math from './math.mjs';
```

**npm 包导入**：
```javascript
const express = require('express');       // CommonJS
import express from 'express';             // ES Module
```

### 2. npm（Node Package Manager）

npm 是 Node.js 的包管理器，npmjs.com 是最大的 JavaScript 包仓库。

```bash
# 初始化项目（生成 package.json）
npm init -y

# 安装依赖
npm install express           # 安装到 dependencies
npm install -D typescript    # 安装到 devDependencies
npm install lodash --save    # 同上
npm install -g nodemon        # 全局安装

# 运行脚本
npm run dev
npm start

# 常用命令
npm update                    # 更新依赖
npm uninstall lodash          # 卸载
npm list                      # 查看已安装
npm ls --depth=0              # 只看顶层依赖
```

**package.json 核心字段**：
```json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

### 3. 事件循环（Event Loop）

Node.js 是**单线程** + **非阻塞 I/O**，通过事件循环处理并发。

```
┌─────────────────────────┐
│         调用栈          │  ← 执行代码的地方
│    (Call Stack)         │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│      事件队列            │  ← 异步任务完成后的回调
│   (Event Queue)          │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│       libuv             │  ← 处理 I/O 操作
│   (C++ 底层库)           │
└─────────────────────────┘
```

**非阻塞示例**：
```javascript
// 阻塞代码
console.log('开始');
const result = fs.readFileSync('big.txt');  // 等待读取完成才继续
console.log('结束');

// 非阻塞代码
console.log('开始');
fs.readFile('big.txt', (err, data) => {      // 立即返回，读取完成后回调
  console.log('读取完成');
});
console.log('结束');  // 这行会先执行
```

**执行顺序**：
```
同步代码 → 微任务(Promise) → 宏任务(setTimeout/setImmediate)
```

---

## 内置模块（核心 API）

### 1. path - 路径操作

```javascript
const path = require('path');

// 路径拼接
path.join('/users', 'app', 'index.js')      // '/users/app/index.js'

// 获取文件扩展名
path.extname('readme.md')                     // '.md'

// 获取文件名
path.basename('/users/app/index.js')          // 'index.js'
path.basename('/users/app/index.js', '.js')  // 'index'

// 判断绝对路径
path.isAbsolute('/users/app')                 // true

// 解析路径
path.parse('/users/app/index.js')
// { root: '/', dir: '/users/app', base: 'index.js', ext: '.js', name: 'index' }
```

### 2. fs - 文件系统

```javascript
const fs = require('fs');

// 同步读取
const content = fs.readFileSync('readme.txt', 'utf8');

// 异步读取（回调）
fs.readFile('readme.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});

// 异步读取（Promise）
const { promises: fsp } = require('fs');
const data = await fsp.readFile('readme.txt', 'utf8');

// 写文件
fs.writeFileSync('output.txt', 'hello world');
fs.writeFile('output.txt', 'hello world', () => {});

// 检查文件/目录是否存在
fs.existsSync('readme.txt')                    // true/false

// 创建目录
fs.mkdirSync('./dist', { recursive: true });

// 读取目录
const files = fs.readdirSync('./src');        // ['index.js', 'app.js']

// 删除文件
fs.unlinkSync('temp.txt');

// 重命名
fs.renameSync('old.txt', 'new.txt');

// 监听文件变化
fs.watch('file.txt', (event, filename) => {
  console.log(`${filename} 发生变化`);
});
```

### 3. http - 创建 Web 服务器

```javascript
const http = require('http');

// 创建服务器
const server = http.createServer((req, res) => {
  // req = 请求对象
  // res = 响应对象

  // 设置响应头
  res.setHeader('Content-Type', 'application/json');

  // 设置状态码
  res.statusCode = 200;

  // 写入响应体
  res.end(JSON.stringify({ message: 'hello' }));
});

server.listen(3000, () => {
  console.log('服务器在 http://localhost:3000');
});

// 发送请求
http.get('http://api.github.com', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

// 发起 POST 请求
const req = http.request({
  method: 'POST',
  hostname: 'api.example.com',
  path: '/users'
}, (res) => {});

req.write(JSON.stringify({ name: '张三' }));
req.end();
```

### 4. os - 操作系统信息

```javascript
const os = require('os');

// CPU 信息
os.cpus()           // [{ model: 'Intel...', speed: 2400, times: {...} }, ...]

// 内存
os.totalmem()       // 总内存（字节）
os.freemem()        // 空闲内存

// 用户信息
os.userInfo()       // { uid, gid, username, homedir, shell }

// 平台
os.platform()       // 'darwin', 'win32', 'linux'
os.arch()           // 'x64', 'arm64'

// 临时目录
os.tmpdir()         // '/var/folders/...'

// 行尾符
os.EOL              // '\n' (Linux/Mac) 或 '\r\n' (Windows)
```

### 5. crypto - 加密

```javascript
const crypto = require('crypto');

// MD5（不推荐用于密码）
const md5 = crypto.createHash('md5').update('hello').digest('hex');

// SHA256
const sha256 = crypto.createHash('sha256').update('hello').digest('hex');

// 随机字符串
const token = crypto.randomBytes(16).toString('hex');

// AES 加密
const cipher = crypto.createCipher('aes256', 'password');
let encrypted = cipher.update('secret', 'utf8', 'hex');
encrypted += cipher.final('hex');
```

### 6. events - 事件系统

```javascript
const EventEmitter = require('events');

// 创建事件发射器
const emitter = new EventEmitter();

// 监听事件
emitter.on('message', (data) => {
  console.log('收到消息:', data);
});

// 触发事件
emitter.emit('message', 'Hello World');

// 只监听一次
emitter.once('connect', () => {
  console.log('连接成功');
});

// 移除监听
emitter.off('message', handler);
```

### 7. process - 进程信息

```javascript
// 进程信息
process.pid              // 进程 ID
process.version          // Node 版本
process.platform         // 操作系统平台
process.cwd()            // 当前工作目录

// 命令行参数
process.argv             // ['node', 'app.js', '--flag', 'value']

// 环境变量
process.env.NODE_ENV      // 'development' | 'production'
process.env.PORT          // 端口

// 退出进程
process.exit(0);          // 正常退出
process.exit(1);          // 异常退出

// 捕获未处理的错误
process.on('uncaughtException', (err) => {
  console.error('捕获到错误:', err);
});
```

### 8. buffer - 二进制数据

```javascript
// 创建 Buffer
const buf = Buffer.from('hello', 'utf8');
const buf2 = Buffer.alloc(10);        // 分配 10 字节
const buf3 = Buffer.allocUnsafe(10); // 快速分配（可能有旧数据）

// 转换
Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]).toString('utf8');

// 拼接
const combined = Buffer.concat([buf1, buf2]);
```

---

## CommonJS vs ES Module

### CommonJS（Node.js 传统）
```javascript
// 导出
module.exports = { name: '张三' };
exports.age = 18;  // 等价于上面的写法

// 导入
const utils = require('./utils');
const { name } = require('./utils');
```

### ES Module（现代）
```javascript
// 导出
export const name = '张三';
export default class User {}

// 导入
import { name } from './utils.mjs';
import User from './user.mjs';
```

**注意**：ES Module 需要 `.mjs` 扩展名或 `"type": "module"`。

---

## 异步编程模式演变

### 1. 回调函数（早期）
```javascript
fs.readFile('file.txt', (err, data) => {
  if (err) return console.error(err);
  console.log(data);
});
```

### 2. Promise（中期）
```javascript
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

readFile('file.txt').then(data => {
  console.log(data);
}).catch(err => {
  console.error(err);
});
```

### 3. async/await（现代）
```javascript
const { promises: fsp } = require('fs');

async function main() {
  try {
    const data = await fsp.readFile('file.txt');
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

main();
```

---

## 文件操作实战

### 批量重命名文件
```javascript
const fs = require('fs');
const path = require('path');

const dir = './images';
const files = fs.readdirSync(dir);

files.forEach(file => {
  const oldPath = path.join(dir, file);
  const newName = `prefix_${file}`;
  const newPath = path.join(dir, newName);
  fs.renameSync(oldPath, newPath);
});
```

### 读取 JSON 配置
```javascript
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
console.log(config.port);
```

### 日志写入
```javascript
const fs = require('fs');

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('app.log', line);
}

log('服务器启动');
log('收到请求');
```

---

## 本项目中的 Node.js 用法

在 `backend/src/index.ts` 中：

```typescript
import fs from 'fs';           // 文件操作
import path from 'path';        // 路径处理
import http from 'http';        // HTTP 服务器
import os from 'os';           // 系统信息
import crypto from 'crypto';    // 加密
import { promisify } from 'util';
```

实际上 Express 框架已经封装了 `http` 模块，所以我们主要用的是 `fs` 和 `path`。

---

## 学习路径建议

1. **基础**：模块系统、npm、package.json
2. **核心 API**：fs、path、http、os、events
3. **异步编程**：回调 → Promise → async/await
4. **框架**：Express（Web 开发）
5. **进阶**：Stream、Buffer、Net（TCP/UDP）

---

## 常用命令

```bash
# 运行 JavaScript 文件
node app.js

# 运行并监听变化（自动重启）
nodemon app.js

# 检查代码语法
node --check app.js

# 显示版本
node -v

# 调试模式
node inspect app.js

# 生成堆快照（排查内存问题）
node --prof app.js
```
