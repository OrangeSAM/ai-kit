# Node.js 与数据库交互

## 为什么要用数据库？

**程序 vs 文件存储**：
```
文件存储：                    数据库：
用户数据 → 写入 file.json   用户数据 → INSERT INTO users
读取用户 → 读取 file.json   读取用户 → SELECT * FROM users
搜索用户 → 遍历所有数据      搜索用户 → WHERE name LIKE '%xx%'
```

数据库的优势：
- 并发安全（多用户同时读写不会冲突）
- 查询高效（索引、优化器）
- 事务支持（原子操作）
- 关系管理（表关联）

---

## 数据库类型

| 类型 | 代表 | 特点 | 适用场景 |
|------|------|------|---------|
| **关系型** | MySQL、PostgreSQL | 表、行列、SQL | 电商、用户、订单 |
| **文档型** | MongoDB | JSON 文档、无结构 | 日志、评论、内容 |
| **KV 键值** | Redis | 内存、极快 | 缓存、Session |
| **图数据库** | Neo4j | 节点、边 | 社交关系、知识图谱 |

---

## MongoDB（文档数据库）

### 概念对比

| SQL 概念 | MongoDB 概念 |
|----------|-------------|
| Database | Database |
| Table | Collection |
| Row | Document |
| Column | Field |
| JOIN | $lookup / 嵌套文档 |
| PRIMARY KEY | _id（自动生成） |

### 基本操作

```javascript
const { MongoClient } = require('mongodb');

// 连接
const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('myapp');

// Collection（表）
const users = db.collection('users');

// 插入
await users.insertOne({ name: '张三', age: 25 });
await users.insertMany([
  { name: '李四', age: 30 },
  { name: '王五', age: 28 }
]);

// 查询
const user = await users.findOne({ name: '张三' });
const allUsers = await users.find({ age: { $gt: 25 } }).toArray();

// 更新
await users.updateOne(
  { name: '张三' },
  { $set: { age: 26 } }
);

// 删除
await users.deleteOne({ name: '王五' });
```

### 常用查询操作符

```javascript
// 比较
{ age: { $gt: 25 } }           // 大于
{ age: { $gte: 25 } }          // 大于等于
{ age: { $lt: 30 } }           // 小于
{ name: { $in: ['张三', '李四'] } }  // 在列表中

// 逻辑
{ $and: [{ age: { $gt: 20 } }, { age: { $lt: 30 } }] }
{ $or: [{ name: '张三' }, { name: '李四' }] }

// 正则
{ name: { $regex: '张.*' } }

// 嵌套字段
{ 'address.city': '北京' }

// 数组
{ tags: { $in: ['程序员', '北京'] } }
```

### mongoose（更流行的 ORM）

```javascript
const mongoose = require('mongoose');

// 连接
mongoose.connect('mongodb://localhost:27017/myapp');

// 定义 Schema
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  email: { type: String, unique: true },  // 唯一索引
  createdAt: { type: Date, default: Date.now }
});

// 创建 Model
const User = mongoose.model('User', userSchema);

// 插入
const user = await User.create({ name: '张三', age: 25 });

// 查询
const user = await User.findOne({ name: '张三' });
const users = await User.find({ age: { $gt: 25 } });

// 更新
await User.updateOne({ name: '张三' }, { age: 26 });
await User.findByIdAndUpdate(id, { age: 27 });

// 删除
await User.deleteOne({ name: '张三' });
await User.findByIdAndDelete(id);

// 关联查询（populate）
const posts = await Post.find().populate('author', 'name');
```

---

## MySQL（关系型数据库）

### 基本操作（mysql2）

```javascript
const mysql = require('mysql2/promise');

// 创建连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp',
  waitForConnections: true,
  connectionLimit: 10,  // 最大连接数
  queueLimit: 0
});

// 查询
const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [1]);
const [rows] = await pool.execute('SELECT * FROM users WHERE age > ?', [25]);

// 插入
await pool.query(
  'INSERT INTO users (name, age, email) VALUES (?, ?, ?)',
  ['张三', 25, 'zhangsan@example.com']
);

// 更新
await pool.query(
  'UPDATE users SET age = ? WHERE name = ?',
  [26, '张三']
);

// 删除
await pool.query('DELETE FROM users WHERE id = ?', [1]);

// 事务
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();

  await connection.query('INSERT INTO orders (user_id, total) VALUES (?, ?)', [1, 100]);
  await connection.query('UPDATE users SET points = points + 100 WHERE id = ?', [1]);

  await connection.commit();
} catch (err) {
  await connection.rollback();
  throw err;
} finally {
  connection.release();
}
```

### Sequelize（ORM）

```javascript
const { Sequelize, DataTypes } = require('sequelize');

// 连接
const sequelize = new Sequelize('myapp', 'root', 'password', {
  host: 'localhost',
  dialect: 'mysql'
});

// 定义模型
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  age: { type: DataTypes.INTEGER },
  email: { type: DataTypes.STRING, unique: true }
});

const Order = sequelize.define('Order', {
  total: { type: DataTypes.DECIMAL(10, 2) }
});

// 关联
User.hasMany(Order);
Order.belongsTo(User);

// 同步数据库
await sequelize.sync();

// 插入
const user = await User.create({ name: '张三', age: 25 });

// 查询
const users = await User.findAll({ where: { age: { [Op.gt]: 25 } } });
const user = await User.findByPk(1);
const user = await User.findOne({ where: { name: '张三' } });

// 更新
await user.update({ age: 26 });

// 删除
await user.destroy();

// 关联查询
const orders = await User.findAll({
  include: Order
});
```

---

## Redis（键值数据库）

Redis 运行在内存中，速度极快，常用于缓存。

```javascript
const { createClient } = require('redis');

const client = createClient();

await client.connect();

// 字符串
await client.set('name', '张三');
const name = await client.get('name');

// 数字（自增）
await client.set('counter', 0);
await client.incr('counter');
await client.decr('counter');

// 哈希（对象）
await client.hSet('user:1', { name: '张三', age: '25' });
const user = await client.hGetAll('user:1');

// 列表
await client.lPush('queue', 'task1');
await client.rPush('queue', 'task2');
const task = await client.rPop('queue');

// 集合
await client.sAdd('tags', ['javascript', 'nodejs']);
const tags = await client.sMembers('tags');

// 设置过期
await client.set('token', 'abc123', { EX: 3600 });  // 1 小时后过期

// 模式匹配
const keys = await client.keys('user:*');
```

### Redis 实际应用场景

```javascript
// 1. 缓存
async function getUser(id) {
  const cacheKey = `user:${id}`;
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await db.collection('users').findOne({ _id: id });
  await client.set(cacheKey, JSON.stringify(user), { EX: 300 });  // 缓存 5 分钟
  return user;
}

// 2. Session 存储
await client.hSet(`session:${sessionId}`, {
  userId: user.id,
  createdAt: Date.now()
});
await client.expire(`session:${sessionId}`, 86400);  // 24 小时

// 3. 限流
const key = `rate:${ip}:${minute}`;
const count = await client.incr(key);
if (count === 1) await client.expire(key, 60);
if (count > 100) return res.status(429).send('请求过于频繁');

// 4. 消息队列
await client.lPush('jobs', JSON.stringify({ type: 'email', data }));
const job = await client.rPop('jobs');
```

---

## 数据库连接池

**为什么需要连接池？**

```
无连接池：                    有连接池：
请求1 → 建立连接 → 查询 → 关闭  请求1 → 获取连接 → 查询 → 归还
请求2 → 建立连接 → 查询 → 关闭  请求2 → 获取连接 → 查询 → 归还
请求3 → 建立连接 → 查询 → 关闭  请求3 → 获取连接 → 查询 → 归还
         ↑                                      ↑
      每次新建耗时 100ms                    复用已有连接 0ms
```

```javascript
// mysql2 连接池
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'myapp',
  connectionLimit: 10,   // 最多 10 个连接
  waitForConnections: true,
  queueLimit: 0
});

// MongoDB 连接池（自动管理）
const client = new MongoClient('mongodb://localhost:27017', {
  maxPoolSize: 10,  // 最多 10 个连接
  minSize: 2        // 最小保持 2 个连接
});
```

---

## 本项目可以如何集成数据库

### 添加 MongoDB 存储对话历史

```javascript
// 新建 db.js
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017');
await client.connect();
const db = client.db('ai-kit');

const conversations = db.collection('conversations');

// 保存对话
await conversations.insertOne({
  userId: 'user123',
  messages: [
    { role: 'user', content: '你好' },
    { role: 'assistant', content: '你好！' }
  ],
  createdAt: new Date()
});

// 查询历史
const history = await conversations
  .find({ userId: 'user123' })
  .sort({ createdAt: -1 })
  .limit(10)
  .toArray();
```

### 添加 Redis 缓存模型响应

```javascript
const { createClient } = require('redis');
const client = createClient();

async function getCachedResponse(prompt) {
  const key = `cache:response:${hash(prompt)}`;
  return await client.get(key);
}

async function cacheResponse(prompt, response) {
  const key = `cache:response:${hash(prompt)}`;
  await client.set(key, response, { EX: 3600 });  // 1 小时过期
}
```

---

## 选择建议

| 场景 | 推荐 |
|------|------|
| 快速原型、个人项目 | MongoDB + mongoose |
| 企业级应用、事务需求 | PostgreSQL + Sequelize |
| 高频缓存、Session | Redis |
| 复杂报表、关联查询 | PostgreSQL |
| 日志、文档存储 | MongoDB |

---

## 环境变量配置

```javascript
// config/database.js
module.exports = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp'
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'myapp'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
};
```
