---
name: guguya
description: 咕咕丫 (Guguya) 智能知识库管理工具。可以创建知识、管理知识库、向知识库添加内容、与知识库进行AI对话。支持协作知识库和订阅知识库。
user-invocable: true
metadata: {"openclaw": {"minVersion": "1.0.0"}}
functions:
  - name: guguya
    description: 咕咕丫知识库操作函数。支持查询知识库对话、创建知识、创建知识库、获取知识库列表、将知识添加到知识库等操作。
    parameters:
      type: object
      properties:
        action:
          type: string
          description: 操作类型：query(知识库对话) | create_knowledge(创建知识) | create_dataset(创建知识库) | list_datasets(获取知识库列表) | add_to_dataset(将知识添加到知识库)
          enum: [query, create_knowledge, create_dataset, list_datasets, add_to_dataset]
        query:
          type: string
          description: 对话内容或查询问题（action=query 时必填）
        knowledge_base:
          type: string
          description: 知识库名称（action=query/add_to_dataset 时使用）
        dataset_id:
          type: string
          description: 知识库ID，如果已知可直接传入，无需再查询列表
        title:
          type: string
          description: 知识标题（action=create_knowledge 时使用）
        content:
          type: string
          description: 知识内容（action=create_knowledge 时必填）
        name:
          type: string
          description: 知识库名称（action=create_dataset 时必填）
        knowledge_id:
          type: string
          description: 知识ID（action=add_to_dataset 时必填）
      required:
        - action
## 函数执行逻辑

当 Copaw/OpenClaw 调用 `guguya` 函数时，根据 `action` 参数执行对应操作：

### action = "query" — 知识库对话

```
1. 如果有 dataset_id 直接用，如果只有 knowledge_base，先调用列表接口查找 ID
2. GET {GUGUYA_API_BASE}/api/datasets
   Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
   找到匹配 knowledge_base 名称的知识库
3. POST {GUGUYA_API_BASE}/api/chat
   {
     "question": "<query 字段内容>",
     "datasetIds": ["<datasetId>"],
     "mode": "knowledge"
   }
4. 返回 AI 回答内容
```

### action = "create_knowledge" — 创建知识

```
POST {GUGUYA_API_BASE}/api/knowledge
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
{
  "type": "text",
  "title": "<title 字段，如没有则从 content 中提取>",
  "content": "<content 字段>"
}
返回创建的知识 ID 和标题
```

### action = "create_dataset" — 创建知识库

```
POST {GUGUYA_API_BASE}/api/datasets
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
{
  "name": "<name 字段>"
}
返回创建的知识库 ID 和名称
```

### action = "list_datasets" — 获取知识库列表

```
GET {GUGUYA_API_BASE}/api/datasets
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
返回知识库列表，包含 _id、name、knowledgeCount
```

### action = "add_to_dataset" — 将知识添加到知识库

```
1. 如果没有 dataset_id，先查询列表找到 knowledge_base 对应的 ID
2. POST {GUGUYA_API_BASE}/api/knowledge/batch/add-to-dataset
   {
     "knowledgeIds": ["<knowledge_id 字段>"],
     "datasetId": "<dataset_id>"
   }
返回添加成功的确认信息
```

---



使用前需要在 OpenClaw 配置中设置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GUGUYA_API_BASE` | API 服务地址 | `https://api.guguya.com` |
| `GUGUYA_APP_ID` | 应用 AppID（在咕咕丫个人设置 → API 应用中创建） | `app_a1b2c3d4e5f6g7h8` |
| `GUGUYA_APP_KEY` | 应用 AppKey（仅创建时可见，请妥善保存） | `sk-xxxxxxxxxxxxxxxx` |

> 在咕咕丫 Web 端：**个人设置 → API 应用 → 创建应用**，即可获取 AppID 和 AppKey。

---

## 功能说明

本技能提供以下能力：

1. **创建知识** — 将文本内容保存为知识条目
2. **创建知识库** — 新建知识库并命名
3. **添加到知识库** — 将知识条目关联到指定知识库
4. **知识对话** — 与指定知识库进行 AI 问答
5. **查看知识库列表** — 列出当前用户的所有知识库

---

## 请求规范

所有 API 请求使用以下格式：

- **Base URL**：环境变量 `GUGUYA_API_BASE`（默认 `https://api.guguya.com`）
- **认证 Header**：`Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}`
- **Content-Type**：`application/json`

---

## 操作指令

### 1. 创建知识

**触发词**：「帮我记录」「保存这条知识」「记一下」「添加知识」「保存」

**调用接口**：

```
POST {GUGUYA_API_BASE}/api/knowledge
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
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

**调用接口**：

```
POST {GUGUYA_API_BASE}/api/datasets
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
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

```
GET {GUGUYA_API_BASE}/api/datasets
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
```

响应为知识库数组，根据用户说的名称找到对应的 `_id`。

**步骤 2**：创建知识（参考操作1）

**步骤 3**：关联到目标知识库

```
POST {GUGUYA_API_BASE}/api/knowledge/batch/add-to-dataset
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
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

**执行步骤**：

**步骤 1**：如用户指定了知识库名称，先查询知识库列表获取 datasetId

```
GET {GUGUYA_API_BASE}/api/datasets
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
```

**步骤 2**：发起流式对话

```
POST {GUGUYA_API_BASE}/api/chat/stream
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
Content-Type: application/json

{
  "question": "<用户的问题>",
  "datasetIds": ["<datasetId>"],
  "mode": "knowledge"
}
```

> **注意**：
> - 不指定知识库时，`datasetIds` 可不传，系统使用用户的默认知识库
> - **协作知识库**（被邀请加入的）和**订阅知识库**（付费订阅的）均可通过传入对应 datasetId 发起对话
> - 流式响应为 Server-Sent Events (SSE) 格式，逐步输出回答内容

**步骤 3**：读取 SSE 流式响应并实时输出给用户

---

### 5. 获取知识库列表

**触发词**：「我有哪些知识库」「列出我的知识库」「查看我的库」「知识库列表」

**调用接口**：

```
GET {GUGUYA_API_BASE}/api/datasets
Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}
```

**成功响应**（HTTP 200）：返回知识库数组，每个包含 `_id`、`name`、`description`、`knowledgeCount` 等字段。

**回复用户**：列出所有知识库名称和知识数量，格式美观易读。

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
3. 调用 POST /api/knowledge
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
