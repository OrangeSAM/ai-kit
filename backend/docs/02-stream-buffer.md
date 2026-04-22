# Node.js 进阶：Stream 与 Buffer

## 为什么需要 Stream 和 Buffer？

**问题场景**：处理大文件（如 4K 视频、10GB 日志文件）

```
传统方式（一次性读取）：
┌─────────────────────────────────┐
│ 10GB 文件                       │
│ ↓ readFileSync()                │
│ 全部加载到内存 → 内存爆炸 💥      │
└─────────────────────────────────┘

Stream 方式（分块处理）：
┌───┬───┬───┬───┬───┐
│块1│块2│块3│块4│...│  → 逐块读取 → 处理 → 释放
└───┴───┴───┴───┴───┘
内存占用固定，不随文件大小增长
```

**一句话理解**：
- **Buffer** = 一块固定大小的内存，存放二进制数据
- **Stream** = 一条流水线，数据在流水线上流动、逐块处理

---

## Buffer

### 1. 什么是 Buffer？

Buffer 是 Node.js 用来处理**二进制数据**的对象。

为什么需要？因为 JavaScript 字符串在 Node.js 早期不适合处理 TCP 协议中的二进制数据（如文件、图片、网络包）。

```javascript
// 创建 Buffer
const buf = Buffer.from('hello 你好', 'utf8');
console.log(buf);
// <Buffer 68 65 6c 6c 6f 20 e4 bd a0 e5 a5 bd>
// 每个字节对应一个十六进制数
```

### 2. Buffer 与字符串转换

```javascript
// 字符串 → Buffer
const buf = Buffer.from('hello', 'utf8');

// Buffer → 字符串
const str = buf.toString('utf8');
const hex = buf.toString('hex');        // 十六进制表示
const base64 = buf.toString('base64');  // Base64 编码

// 不同编码
const bufUtf8 = Buffer.from('你好', 'utf8');   // 6 字节
const bufGbk = Buffer.from('你好', 'gbk');     // 4 字节
```

### 3. Buffer 的内存分配

```javascript
// 分配指定字节的 Buffer（内容是 0）
const buf1 = Buffer.alloc(10);           // 10 字节，全 0

// 快速分配（可能有旧数据残留，不安全）
const buf2 = Buffer.allocUnsafe(10);

// 用数据填充
const buf3 = Buffer.alloc(5, 'a');        // 'aaaaa'

// 从数组创建
const buf4 = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // 'hello'
```

### 4. Buffer 的读写

```javascript
const buf = Buffer.from('hello world');

// 读取
buf[0]                // 104（'h' 的 ASCII 码）
buf[0] = 72;         // 修改为 'H'

// 切片（共享内存）
const sub = buf.slice(0, 5);
sub[0] = 72;         // 同时修改 buf[0]

// 复制
const copy = Buffer.alloc(5);
buf.copy(copy, 0, 0, 5);  // copy: 'hello'

// 比较
Buffer.compare(buf1, buf2);  // 0 相等，1 buf1 > buf2，-1 buf1 < buf2

// 连接
const combined = Buffer.concat([buf1, buf2]);
```

### 5. 实际场景：Base64 图片处理

```javascript
// 场景：前端传 Base64 图片，后端保存为文件

const base64String = 'data:image/png;base64,iVBORw0KGgo...';  // 很长的字符串

// 方法 1：提取 Base64 部分（去掉 header）
const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
const buffer = Buffer.from(base64Data, 'base64');

// 写入文件
fs.writeFileSync('image.png', buffer);

// 反向：文件 → Base64
const imageBuffer = fs.readFileSync('image.png');
const base64Image = imageBuffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64Image}`;
```

---

## Stream

### 1. 四种 Stream 类型

```
┌─────────────────────────────────────────────────────┐
│                    Stream 类型                       │
├─────────────┬─────────────────┬─────────────────────┤
│   Readable  │  Writable       │  Duplex             │ Transform
│   可读流     │  可写流          │  双向流（可读可写）   │ 转换流
├─────────────┼─────────────────┼─────────────────────┤
│ fs.createReadStream   │ fs.createWriteStream │ net.Socket   │ zlib.createGzip
│ http.IncomingMessage  │ process.stdout      │              │ crypto.createCipher
│ response.body (fetch) │ res (Express)       │              │ through2
└─────────────┴─────────────────┴─────────────────────┘
```

### 2. Readable Stream - 读取数据

```javascript
const fs = require('fs');

// 方式 1：事件监听
const readStream = fs.createReadStream('./bigfile.txt', {
  encoding: 'utf8',      // 或 'buffer'
  highWaterMark: 64 * 1024,  // 64KB 为一块（默认 64KB）
  start: 0,
  end: 1000              // 只读前 1000 字节
});

readStream.on('data', (chunk) => {
  console.log('收到数据块:', chunk.length, '字节');
});

readStream.on('end', () => {
  console.log('读取完成');
});

readStream.on('error', (err) => {
  console.error('读取错误:', err);
});

// 方式 2：流式消费（for await）
const readable = fs.createReadStream('./file.txt');
for await (const chunk of readable) {
  console.log(chunk);
}

// 方式 3：pipe 到可写流
readStream.pipe(process.stdout);
```

### 3. Writable Stream - 写入数据

```javascript
const fs = require('fs');

// 创建可写流
const writeStream = fs.createWriteStream('./output.txt', {
  flags: 'a',           // 'w' 覆盖，'a' 追加
  encoding: 'utf8',
  highWaterMark: 16 * 1024  // 16KB
});

// 写入
writeStream.write('第一行\n');
writeStream.write('第二行\n');

// 标记写入结束
writeStream.end();

// 事件
writeStream.on('finish', () => {
  console.log('写入完成');
});

writeStream.on('error', (err) => {
  console.error('写入错误:', err);
});

// 背压处理：可写流满了怎么办？
const canContinue = writeStream.write('大量数据...');
if (!canContinue) {
  writeStream.once('drain', () => {
    // 等待可写流清空后继续
    writeStream.write('继续写入');
  });
}
```

### 4. Transform Stream - 转换流

Transform 是 Duplex 的一种，输入经过转换后输出。

```javascript
const { Transform } = require('stream');

// 示例：转大写
const upperCase = new Transform({
  transform(chunk, encoding, callback) {
    // chunk 是 Buffer，转字符串再转大写
    const upper = chunk.toString().toUpperCase();
    // 第一个参数是错误，第二个是转换后的数据
    callback(null, upper);
  }
});

fs.createReadStream('./input.txt')
  .pipe(upperCase)
  .pipe(fs.createWriteStream('./output.txt'));
```

**常用 Transform**：
- `zlib.createGzip()` / `zlib.createGunzip()` - 压缩/解压
- `crypto.createCipher()` / `crypto.createDecipher()` - 加密/解密

### 5. pipeline - 组合多个流

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

// 老写法（需要手动处理错误）
readStream
  .pipe(gzip)
  .pipe(writeStream)
  .on('error', handleError);

// 新写法：pipeline 自动处理错误，结束时调用回调
pipeline(
  fs.createReadStream('./file.txt'),
  zlib.createGzip(),
  fs.createWriteStream('./file.txt.gz'),
  (err) => {
    if (err) {
      console.error('管道失败:', err);
    } else {
      console.log('压缩完成');
    }
  }
);
```

---

## 实战：文件复制（对比三种方式）

```javascript
const fs = require('fs');

// 方式 1：一次性读取（内存压力大）
const data = fs.readFileSync('bigfile.mp4');  // 全部加载到内存
fs.writeFileSync('copy1.mp4', data);

// 方式 2：流式复制（推荐）
const read = fs.createReadStream('bigfile.mp4');
const write = fs.createWriteStream('copy2.mp4');
read.pipe(write);

// 方式 3：手动分块（更精细的控制）
const read = fs.createReadStream('bigfile.mp4', { highWaterMark: 1024 * 1024 }); // 1MB
const write = fs.createWriteStream('copy3.mp4');

read.on('data', (chunk) => {
  const canContinue = write.write(chunk);
  if (!canContinue) {
    read.pause();
    write.once('drain', () => read.resume());
  }
});
```

---

## 实战：压缩文件

```javascript
const fs = require('fs');
const zlib = require('zlib');

// 同步压缩
const data = fs.readFileSync('file.txt');
const compressed = zlib.gzipSync(data);
fs.writeFileSync('file.txt.gz', compressed);

// 流式压缩
fs.createReadStream('file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('file.txt.gz'));

// 解压
fs.createReadStream('file.txt.gz')
  .pipe(zlib.createGunzip())
  .pipe(fs.createWriteStream('file-restored.txt'));
```

---

## 实战：HTTP 文件上传/下载

```javascript
const http = require('http');
const fs = require('fs');

// 文件下载服务器
http.createServer((req, res) => {
  // 设置下载响应头
  res.setHeader('Content-Disposition', 'attachment; filename=bigfile.mp4');
  res.setHeader('Content-Type', 'application/octet-stream');

  // 流式传输，不用担心文件大小
  const readStream = fs.createReadStream('./bigfile.mp4');
  readStream.pipe(res);
}).listen(3000);

// 文件上传服务器
http.createServer((req, res) => {
  if (req.url === '/upload' && req.method === 'POST') {
    const writeStream = fs.createWriteStream('./uploaded.mp4');

    req.on('data', (chunk) => {
      // 上传进度
      console.log('收到', chunk.length, '字节');
    });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.end('上传成功');
    });
  }
}).listen(3001);
```

---

## 实战：WebSocket -like 实时推送

```javascript
const net = require('net');

// TCP 服务器（类似 WebSocket）
const server = net.createServer((socket) => {
  console.log('客户端连接:', socket.remoteAddress);

  // 定期发送数据
  const interval = setInterval(() => {
    socket.write(`服务器时间: ${Date.now()}\n`);
  }, 1000);

  // 接收客户端数据
  socket.on('data', (data) => {
    console.log('客户端说:', data.toString());
  });

  socket.on('close', () => {
    clearInterval(interval);
    console.log('客户端断开');
  });
});

server.listen(8080);
```

---

## Stream 在本项目中的应用

### SSE 流式响应（ChatWindow.tsx）

```typescript
// 前端消费 SSE 流
const response = await fetch('/api/chat/stream', options);
const reader = response.body.getReader();  // ← 这里 Reader 就是 ReadableStream
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();  // ← 逐块读取
  if (done) break;
  const text = decoder.decode(value);            // ← Buffer → 字符串
  // 解析 SSE 事件...
}
```

### 后端 SSE 发送

```typescript
// 后端逐块发送
res.write(`event: content\ndata: ${JSON.stringify({ text: '你好' })}\n\n`);
```

---

## 常见错误与处理

### 1. 内存泄漏

```javascript
// 错误：没有移除监听器，内存泄漏
readStream.on('data', (chunk) => {
  processSomething(chunk);
  readStream.on('data', handle);  // 不断添加新监听器
});

// 正确：使用 once 或者手动移除
readStream.on('data', handle);
readStream.removeListener('data', handle);
```

### 2. 背压导致内存暴涨

```javascript
// 错误：写入速度跟不上读取速度，内存暴涨
readStream.pipe(writeStream);

// 正确：处理背压
readStream.on('data', (chunk) => {
  const canContinue = writeStream.write(chunk);
  if (!canContinue) {
    readStream.pause();
    writeStream.once('drain', () => readStream.resume());
  }
});

// 或者用 pipeline（自动处理）
const { pipeline } = require('stream');
pipeline(readStream, writeStream, (err) => {});
```

### 3. 管道断裂

```javascript
// 错误：目标流错误会导致源流无法感知
source.pipe(dest);
dest.on('error', (err) => source.destroy());

// 正确：用 pipeline
const { pipeline } = require('stream');
pipeline(source, dest, (err) => {
  if (err) console.error('管道错误:', err);
});
```

---

## 总结

| 概念 | 用途 | 关键方法 |
|------|------|---------|
| Buffer | 存放二进制数据的固定大小内存块 | `from()`, `alloc()`, `toString()` |
| Readable | 数据源，逐块产生数据 | `on('data')`, `pipe()`, `for await` |
| Writable | 数据目的地，接收数据 | `write()`, `end()`, `on('finish')` |
| Transform | 转换流，输入 → 转换 → 输出 | `transform(chunk, enc, cb)` |
| pipeline | 组合多个流，自动处理错误 | `pipeline(s1, s2, s3, cb)` |

**什么时候用 Stream**：
- 处理大文件（几 MB、几 GB）
- 网络传输（HTTP、SSE、WebSocket）
- 需要边读边处理（转换、压缩）
- 需要背压控制

**什么时候用 Buffer**：
- 处理二进制数据（图片、文件、网络包）
- 编码转换（Base64、Hex）
- 需要按字节操作数据
