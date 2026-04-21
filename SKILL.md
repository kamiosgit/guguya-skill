---
name: guguya
description: 咕咕丫(Guguya)智能知识库管理工具。创建知识、管理知识库、与知识库AI对话。支持协作和订阅知识库。
version: 1.0.0
user-invocable: true
metadata: {"openclaw": {"requires": {"env": ["GUGUYA_API_BASE", "GUGUYA_APP_ID", "GUGUYA_APP_KEY"]}, "primaryEnv": "GUGUYA_APP_ID", "emoji": "📚", "minVersion": "1.0.0"}}
---

# 咕咕丫 (Guguya) 知识库助手

## 接入方式

咕咕丫支持两种接入 AI Agent 的方式，请根据你的平台选择：

### 方式一：MCP 服务（推荐）

适用于所有支持 MCP (Model Context Protocol) 的平台，如 QwenPaw、Claude Desktop、Cursor 等。MCP 方式提供独立的工具函数，AI Agent 可直接调用，**无需平台内置 HTTP 请求能力**。

**安装步骤：**

1. 下载 MCP 服务器代码（从 guguya-skill 仓库的 `mcp-server` 目录）
2. 安装依赖并构建：
   ```bash
   cd mcp-server
   npm install
   npm run build
   ```
3. 在平台的 MCP 配置中添加：
   ```json
   {
     "key": "guguya",
     "name": "guguya",
     "description": "咕咕丫知识库管理工具",
     "enabled": true,
     "transport": "stdio",
     "command": "node",
     "args": [
       "<MCP服务器路径>/dist/index.js"
     ],
     "env": {
       "GUGUYA_API_BASE": "https://api.guguya.com",
       "GUGUYA_APP_ID": "<你的AppID>",
       "GUGUYA_APP_KEY": "<你的AppKey>"
     }
   }
   ```
4. 将 `<MCP服务器路径>` 替换为实际的 mcp-server 目录绝对路径
5. 将 AppID 和 AppKey 替换为你在咕咕丫 Web 端创建的应用凭证

**MCP 提供的工具函数：**

| 工具名称 | 功能 |
|---------|------|
| `list_datasets` | 获取知识库列表 |
| `query_knowledge` | 与知识库进行 AI 对话 |
| `create_knowledge` | 创建知识条目 |
| `create_dataset` | 创建知识库 |
| `add_knowledge_to_dataset` | 将知识添加到知识库 |

> **提示**：如果你在使用 Skill 方式时遇到"无法执行 HTTP 请求"或"函数未找到"等问题，请切换到 MCP 方式。

### 方式二：Skill 配置（需平台支持 HTTP 工具）

适用于内置 HTTP 请求工具的平台（如 CoPaw、OpenClaw 等）。AI Agent 读取下方的 API 操作指令后，使用平台的 `http_request`、`fetch` 或 `curl` 工具执行调用。

> **注意**：如果你的平台没有内置 HTTP 请求工具（如 QwenPaw），Skill 方式将无法工作，请使用上方的 MCP 方式。

---

> 以下是 Skill 方式（方式二）的 API 操作指令。如果你的平台不支持 HTTP 请求工具，请使用上方的 MCP 方式（方式一）。

---

## 环境变量配置

使用前请在平台配置中设置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GUGUYA_API_BASE` | API 服务地址（可选，有默认值） | `https://api.guguya.com` |
| `GUGUYA_APP_ID` | 应用 AppID | `app_a1b2c3d4e5f6g7h8` |
| `GUGUYA_APP_KEY` | 应用 AppKey（仅创建时可见） | `sk-xxxxxxxxxxxxxxxx` |

> 在咕咕丫 Web 端：**个人设置 → API 应用 → 创建应用**，即可获取 AppID 和 AppKey。

---

## 通用请求规范

所有 API 请求使用以下格式：

- **Base URL**：`${GUGUYA_API_BASE}`（默认 `https://api.guguya.com`）
- **认证 Header**：`Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}`
- **Content-Type**：`application/json`

---

## 功能说明

本技能提供以下 5 个操作：

1. **创建知识** — 将文本内容保存为知识条目
2. **创建知识库** — 新建知识库并命名
3. **将知识添加到知识库** — 关联知识条目到指定知识库（多步操作）
4. **与知识库对话** — 对指定知识库进行 AI 问答
5. **获取知识库列表** — 列出当前用户的所有知识库

---

## 操作指令

### 1. 创建知识

**触发词**：「帮我记录」「保存这条知识」「记一下」「添加知识」「保存」

**HTTP 请求模板**：

```http
POST ${GUGUYA_API_BASE}/api/knowledge
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
Content-Type: application/json

{
  "type": "text",
  "title": "<从内容中提取的简短标题，15字以内>",
  "content": "<用户提供的内容原文>"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "data": {
    "_id": "<knowledgeId>",
    "title": "知识标题",
    "status": "pending"
  }
}
```

**回复用户**：创建成功后，告知用户知识 ID 和标题，说明正在异步处理（通常 10-30 秒完成向量化）。

---

### 2. 创建知识库

**触发词**：「创建知识库」「新建一个知识库」「建一个库」「新建库」

**HTTP 请求模板**：

```http
POST ${GUGUYA_API_BASE}/api/datasets
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
Content-Type: application/json

{
  "name": "<用户指定的知识库名称>",
  "description": "<可选描述，从用户话语中提取>"
}
```

**成功响应**（HTTP 200）：

```json
{
  "success": true,
  "data": {
    "_id": "<datasetId>",
    "name": "知识库名称"
  }
}
```

**回复用户**：创建成功后，告知用户知识库 ID 和名称。

---

### 3. 将知识添加到知识库

**触发词**：「把这条知识放到XX库」「添加到XX知识库」「存到XX里」

**执行步骤**：

**步骤 1**：如未知 datasetId，先查询知识库列表找到目标库

```http
GET ${GUGUYA_API_BASE}/api/datasets
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
```

响应为知识库数组，根据用户说的名称找到对应的 `_id`。

**步骤 2**：创建知识（参考操作 1）

**步骤 3**：关联到目标知识库

```http
POST ${GUGUYA_API_BASE}/api/knowledge/batch/add-to-dataset
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
Content-Type: application/json

{
  "knowledgeIds": ["<knowledgeId>"],
  "datasetId": "<目标知识库ID>"
}
```

**回复用户**：告知知识已创建并成功添加到指定知识库。

---

### 4. 与知识库对话

**触发词**：「问问XX知识库」「和XX库对话」「在XX知识库里查一下」「问一下」「查一下」

**步骤 1**：如用户指定了知识库名称，先查询知识库列表获取 datasetId

```http
GET ${GUGUYA_API_BASE}/api/datasets
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
```

**步骤 2**：发起流式对话

```http
POST ${GUGUYA_API_BASE}/api/chat/stream
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
Content-Type: application/json

{
  "question": "<用户的问题>",
  "datasetIds": ["<datasetId>"],
  "mode": "knowledge"
}
```

> **注意**：
> - 不指定知识库时，`datasetIds` 可不传，系统使用用户的默认知识库
> - 协作知识库和订阅知识库均可通过传入对应 datasetId 发起对话
> - 流式响应为 Server-Sent Events (SSE) 格式，逐步输出回答内容

**步骤 3**：读取 SSE 流式响应并实时输出给用户

---

### 5. 获取知识库列表

**触发词**：「我有哪些知识库」「列出我的知识库」「查看我的库」「知识库列表」

**HTTP 请求模板**：

```http
GET ${GUGUYA_API_BASE}/api/datasets
Authorization: AppKey ${GUGUYA_APP_ID}:${GUGUYA_APP_KEY}
```

**成功响应**（HTTP 200）：返回知识库数组，每个包含 `_id`、`name`、`description`、`knowledgeCount` 等字段。

**回复用户**：列出所有知识库名称和知识数量，格式美观易读。

---

## 给 AI Agent 的执行指引

**重要**：本技能是配置型技能，不包含任何本地函数实现。当用户触发以上操作时，你需要：

1. 识别用户意图，匹配对应的操作指令
2. 从环境变量中读取 `GUGUYA_API_BASE`（默认 `https://api.guguya.com`）、`GUGUYA_APP_ID`、`GUGUYA_APP_KEY`
3. 使用你平台内置的 HTTP 请求工具（`http_request` / `fetch` / `curl` / 网络请求等）按模板发起请求
4. 解析响应，向用户返回友好的结果说明
5. 遇到错误时，参考下方错误处理表给出对应提示

---

## 错误处理

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| 401 | AppKey 无效或已失效 | 提示用户检查 GUGUYA_APP_ID 和 GUGUYA_APP_KEY 配置是否正确 |
| 403 | 无权限操作该知识库 | 提示用户检查是否有协作权限，或订阅是否有效 |
| 429 | 超出对话配额 | 提示用户当日对话次数已用完，次日重置 |
| 404 | 知识或知识库不存在 | 提示用户检查 ID 是否正确 |
| 500 | 服务器内部错误 | 提示用户稍后重试 |

---

## 使用示例

### 示例 1：保存一条知识

```
用户：「帮我记一下：React 18 的并发特性使用 useTransition 可以标记低优先级状态更新，避免阻塞UI渲染」

Agent 执行：
1. 识别为创建知识操作
2. 提取标题：「React 18 并发特性 useTransition」
3. 使用 http_request 工具调用 POST /api/knowledge
4. 返回：✅ 已为你保存这条知识「React 18 并发特性 useTransition」，知识ID：xxx
```

### 示例 2：创建知识库并保存

```
用户：「新建一个叫"前端技术笔记"的知识库，然后把刚才那条知识存进去」

Agent 执行：
1. 调用 POST /api/datasets，name="前端技术笔记"
2. 获取返回的 datasetId
3. 调用 POST /api/knowledge/batch/add-to-dataset 将知识关联到新知识库
4. 返回：✅ 已创建知识库「前端技术笔记」并添加了1条知识
```

### 示例 3：知识库问答

```
用户：「在前端技术笔记里查一下 useTransition 怎么用」

Agent 执行：
1. 调用 GET /api/datasets 找到「前端技术笔记」的 datasetId
2. 调用 POST /api/chat/stream，传入 question 和 datasetId
3. 流式输出 AI 回答内容
```

---

## 补充说明

- **知识处理时间**：创建知识后，系统会异步进行内容解析和向量化（通常 10-60 秒），完成后才能被检索到
- **知识库范围**：如果 AppKey 创建时绑定了特定知识库，则所有操作仅限该知识库，无法操作其他知识库
- **协作与订阅**：对话时支持用户有权访问的所有知识库（自有、协作、订阅），通过传入正确的 datasetId 即可
- **接入方式选择**：推荐优先使用 MCP 方式，兼容性最好。如果平台不支持 MCP，再使用 Skill 方式（需平台内置 HTTP 请求工具）
