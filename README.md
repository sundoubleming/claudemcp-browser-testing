# Browser Testing MCP Server

一个基于 Model Context Protocol (MCP) 的浏览器自动化测试服务器，通过 Chrome DevTools Protocol (CDP) 与浏览器交互，让 AI 助手能够控制浏览器、执行 API 调用、检查页面状态和下载文件。

## 功能特性

- 🌐 **浏览器连接** - 连接到远程 Chrome/Edge 浏览器实例
- 🔐 **自动认证** - 自动从 localStorage 注入 JWT token
- 📡 **API 调用** - 在浏览器上下文中执行 HTTP 请求
- 📄 **页面检查** - 获取当前页面 URL、标题、cookies 和认证状态
- 📥 **文件下载** - 下载并解析 CSV、JSON、XLSX 文件
- 💻 **JavaScript 执行** - 在浏览器中执行任意 JavaScript 代码

## 安装

```bash
npm install
```

## 开发

```bash
# 开发模式运行（使用 tsx）
npm run dev

# 构建 TypeScript
npm run build

# 运行编译后的版本
npm start
```

## 配置

### 1. 启动浏览器（调试模式）

在运行 MCP 服务器之前，需要先启动带有远程调试端口的浏览器：

**Windows:**
```bash
chrome.exe --remote-debugging-port=9222
```

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222
```

**Edge:**
```bash
msedge.exe --remote-debugging-port=9222
```

### 2. 配置 Claude Desktop

在 Claude Desktop 的配置文件中添加此 MCP 服务器：

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**配置示例：**

```json
{
  "mcpServers": {
    "browser-testing": {
      "command": "node",
      "args": ["/path/to/claudemcp-browser-testing/dist/index.js"]
    }
  }
}
```

或使用开发模式：

```json
{
  "mcpServers": {
    "browser-testing": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/claudemcp-browser-testing/src/index.ts"]
    }
  }
}
```

### 3. 配置 Claude Code CLI

在 Claude Code CLI 的配置文件中添加此 MCP 服务器：

**全局配置文件位置:** `~/.config/claude/config.json`

**配置示例：**

```json
{
  "mcpServers": {
    "browser-testing": {
      "command": "node",
      "args": ["/path/to/claudemcp-browser-testing/dist/index.js"]
    }
  }
}
```

或使用开发模式：

```json
{
  "mcpServers": {
    "browser-testing": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/claudemcp-browser-testing/src/index.ts"]
    }
  }
}
```

**项目级配置（推荐）:**

在项目根目录创建 `.mcp.json` 文件：

```json
{
  "mcpServers": {
    "browser-testing": {
      "command": "node",
      "args": ["./dist/index.js"]
    }
  }
}
```

或使用开发模式：

```json
{
  "mcpServers": {
    "browser-testing": {
      "command": "npx",
      "args": ["-y", "tsx", "./src/index.ts"]
    }
  }
}
```

> 💡 项目级配置的优势：
> - 配置随项目一起管理
> - 使用相对路径，更便于团队协作
> - 不同项目可以使用不同的 MCP 服务器配置

**使用 Claude Code CLI：**

```bash
# 启动 Claude Code
claude

# 在对话中使用 MCP 工具
> 请连接到本地浏览器，端口 9222
> 帮我测试 /api/users 接口
```

### 4. 跨设备连接配置

如果 Claude 和浏览器不在同一台设备上，需要配置端口转发：

**Windows（管理员权限）:**
```bash
# 添加端口转发
netsh interface portproxy add v4tov4 listenport=9222 listenaddress=0.0.0.0 connectport=9222 connectaddress=127.0.0.1

# 添加防火墙规则
netsh advfirewall firewall add rule name="Chrome Debug Port" dir=in action=allow protocol=TCP localport=9222
```

**Linux:**
```bash
# 开放端口
sudo iptables -A INPUT -p tcp --dport 9222 -j ACCEPT

# 或使用 SSH 隧道
ssh -L 9222:localhost:9222 user@remote-host
```

**macOS:**
```bash
# 使用 SSH 隧道
ssh -L 9222:localhost:9222 user@remote-host
```

## 使用方法

配置完成后，在 Claude Desktop 中可以直接使用自然语言与 MCP 服务器交互。Claude 会自动调用相应的工具来完成任务。

### 提示词示例

**连接浏览器：**
```
请连接到本地浏览器，端口 9222
```

**执行 API 测试：**
```
帮我测试一下 /api/users 接口，使用 GET 方法
```

**检查页面状态：**
```
查看当前浏览器页面的信息和认证状态
```

**下载和检查文件：**
```
从 /api/export/data.csv 下载文件并分析其内容
```

**执行自定义操作：**
```
在浏览器中执行 JavaScript，获取页面上所有链接的 href 属性
```

### 可用工具

#### 1. `connect_browser`

连接到远程 Chrome 实例（必须首先调用）。

**参数：**
- `host` (string) - 浏览器所在主机的 IP 地址，例如 "192.168.1.100" 或 "localhost"
- `port` (number) - Chrome 远程调试端口，默认 9222
- `target_url` (string, 可选) - 要连接的特定标签页 URL 子串

**示例：**
```javascript
// 连接到本地浏览器
connect_browser({ host: "localhost", port: 9222 })

// 连接到远程浏览器的特定标签页
connect_browser({
  host: "192.168.1.100",
  port: 9222,
  target_url: "example.com"
})
```

#### 2. `execute_api_call`

在浏览器上下文中执行 API 调用，自动注入认证 token。

**参数：**
- `method` (string) - HTTP 方法：GET, POST, PUT, DELETE, PATCH
- `path` (string) - API 路径，例如 "/api/tenant/list"
- `headers` (object, 可选) - 额外的 HTTP 头
- `body` (object|string, 可选) - 请求体
- `auto_auth` (boolean) - 自动注入 Authorization 头，默认 true

**示例：**
```javascript
// GET 请求
execute_api_call({
  method: "GET",
  path: "/api/users"
})

// POST 请求
execute_api_call({
  method: "POST",
  path: "/api/users",
  body: { name: "John", email: "john@example.com" }
})
```

#### 3. `get_page_context`

获取当前浏览器页面信息。

**返回：**
- 当前页面 URL
- 页面标题
- 认证 token 状态
- Cookies

**示例：**
```javascript
get_page_context()
```

#### 4. `download_and_inspect_file`

从 API 端点下载文件并检查其内容。

**参数：**
- `method` (string) - HTTP 方法
- `path` (string) - API 路径
- `headers` (object, 可选) - HTTP 头
- `body` (object|string, 可选) - 请求体
- `expected_format` (string, 可选) - 预期格式：csv, json, xlsx
- `auto_auth` (boolean) - 自动注入认证，默认 true

**支持格式：**
- CSV - 返回列名、行数、示例行
- JSON - 返回记录数、示例数据
- XLSX - 返回工作表名称、列名、行数、示例行

**示例：**
```javascript
download_and_inspect_file({
  method: "GET",
  path: "/api/export/users.csv",
  expected_format: "csv"
})
```

#### 5. `evaluate_js`

在浏览器页面上下文中执行任意 JavaScript。

**参数：**
- `expression` (string) - 要执行的 JavaScript 代码
- `await_promise` (boolean) - 是否等待 Promise 完成，默认 true

**示例：**
```javascript
// 获取页面标题
evaluate_js({ expression: "document.title" })

// 执行复杂操作
evaluate_js({
  expression: `
    const elements = document.querySelectorAll('.item');
    return Array.from(elements).map(el => el.textContent);
  `
})

// 点击按钮
evaluate_js({
  expression: "document.querySelector('#submit-btn').click()"
})

// 填写表单
evaluate_js({
  expression: `
    document.querySelector('#username').value = 'testuser';
    document.querySelector('#password').value = 'password123';
    document.querySelector('#login-form').submit();
  `
})

// 等待元素并获取内容
evaluate_js({
  expression: `
    // 点击按钮
    document.querySelector('#load-data').click();

    // 等待数据加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 返回结果
    return document.querySelector('.data-container').innerHTML;
  `
})
```

**支持的网页交互操作：**
- ✅ 点击元素（按钮、链接等）
- ✅ 填写表单字段
- ✅ 选择下拉菜单
- ✅ 勾选复选框/单选框
- ✅ 触发事件（click, change, submit 等）
- ✅ 滚动页面
- ✅ 获取/修改元素内容
- ✅ 等待异步操作完成

## 工作流程示例

### 1. 基本 API 测试

**提示词：**
```
请帮我完成以下测试：
1. 连接到本地浏览器（端口 9222）
2. 检查当前页面的认证状态
3. 测试 GET /api/users 接口
4. 如果返回 401，提醒我需要重新登录
```

**对应的工具调用：**
```javascript
// 1. 连接浏览器
connect_browser({ host: "localhost", port: 9222 })

// 2. 检查页面状态
get_page_context()

// 3. 执行 API 调用
execute_api_call({
  method: "GET",
  path: "/api/users"
})
```

### 2. 文件下载和检查

**提示词：**
```
帮我从 /api/export/data.csv 下载数据文件，并告诉我：
- 文件有多少行
- 有哪些列
- 前几行的数据是什么
```

**对应的工具调用：**
```javascript
// 1. 连接浏览器
connect_browser({ host: "localhost", port: 9222 })

// 2. 下载并检查 CSV 文件
download_and_inspect_file({
  method: "GET",
  path: "/api/export/data.csv",
  expected_format: "csv"
})
```

### 3. 自定义 JavaScript 操作

**提示词：**
```
在当前浏览器页面中：
1. 点击 ID 为 submit-btn 的按钮
2. 等待 1 秒
3. 获取 class 为 result 的元素的文本内容
```

**对应的工具调用：**
```javascript
// 1. 连接浏览器
connect_browser({ host: "localhost", port: 9222 })

// 2. 执行自定义 JavaScript
evaluate_js({
  expression: `
    // 点击按钮
    document.querySelector('#submit-btn').click();

    // 等待响应
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 返回结果
    return document.querySelector('.result').textContent;
  `
})
```

### 4. 网页交互和自动化

**提示词：**
```
帮我在浏览器中完成以下操作：
1. 在用户名输入框中填入 "admin"
2. 在密码输入框中填入 "password123"
3. 点击登录按钮
4. 等待 2 秒后获取页面标题
```

**对应的工具调用：**
```javascript
// 1. 连接浏览器
connect_browser({ host: "localhost", port: 9222 })

// 2. 执行登录操作
evaluate_js({
  expression: `
    // 填写表单
    document.querySelector('#username').value = 'admin';
    document.querySelector('#password').value = 'password123';

    // 点击登录按钮
    document.querySelector('#login-btn').click();

    // 等待页面跳转
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 返回新页面标题
    return document.title;
  `
})
```

### 5. 完整的测试流程

**提示词：**
```
我需要测试用户管理功能：
1. 连接到 192.168.1.100:9222 的浏览器
2. 确认已登录（检查 access_token）
3. 获取用户列表（GET /api/users）
4. 创建新用户（POST /api/users，名字是 "测试用户"，邮箱是 "test@example.com"）
5. 验证新用户是否创建成功
6. 导出用户列表为 CSV（GET /api/users/export）并检查内容
```

Claude 会自动按顺序调用相应的工具，并在每一步给出反馈。

## 认证机制

MCP 服务器会自动从浏览器的 `localStorage` 中读取认证 token：

- `access_token` - JWT 访问令牌
- `refresh_token` - 刷新令牌

当 `auto_auth: true` 时，会自动在请求头中添加：
```
Authorization: Bearer <access_token>
```

如果收到 401 响应，会提示用户重新登录。

## 故障排查

### 连接失败

1. **检查浏览器是否正确启动**
   - 访问 `http://localhost:9222/json` 应该能看到浏览器标签页列表

2. **检查防火墙设置**
   - 确保端口 9222 未被防火墙阻止

3. **检查网络连接**
   - 如果是远程连接，确保两台设备在同一网络或已配置端口转发

4. **查看详细错误信息**
   - `connect_browser` 工具会返回详细的故障排查指导

### 认证失败

1. **确保已登录**
   - 在浏览器中先登录应用，确保 `localStorage` 中有 `access_token`

2. **检查 token 是否过期**
   - 使用 `get_page_context` 查看 token 过期时间

3. **手动设置认证头**
   - 如果自动认证不工作，可以手动传递 `headers` 参数

## 技术架构

- **MCP SDK** - Model Context Protocol 实现
- **Chrome DevTools Protocol** - 浏览器自动化
- **TypeScript** - 类型安全的开发
- **Zod** - 运行时类型验证
- **csv-parse** - CSV 文件解析
- **xlsx** - Excel 文件解析

## 安全注意事项

⚠️ **重要：**
- `evaluate_js` 工具允许执行任意 JavaScript 代码，仅用于可信输入
- 所有用户输入在 `execute_api_call` 中都经过 JSON 序列化以防止注入攻击
- 建议仅在受控环境中使用此工具
- 不要在生产环境中暴露调试端口

## 许可证

Private

## 贡献

欢迎提交 Issue 和 Pull Request！
