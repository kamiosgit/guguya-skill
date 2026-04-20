---
name: guguya-skill
description: 咕咕丫 (Guguya) 智能知识库管理工具。可以创建知识、管理知识库、向知识库添加内容、与知识库进行AI对话。支持协作知识库和订阅知识库。
user-invocable: true
metadata: {"openclaw": {"minVersion": "1.0.0"}}
functions:
  - name: guguya_skill
    description: 咕咕丫知识库操作函数。支持查询知识库对话、创建知识、创建知识库、获取知识库列表、将知识添加到知识库等操作。
    parameters:
      type: object
      properties:
        action:
          type: string
          description: "操作类型：query(知识库对话) | create_knowledge(创建知识) | create_dataset(创建知识库) | list_datasets(获取知识库列表) | add_to_dataset(将知识添加到知识库)"
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
---

# 咕咕丫 (Guguya) 知识库助手

## 前提条件

使用前需要在 OpenClaw/Copaw 配置中设置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GUGUYA_API_BASE` | API 服务地址 | `https://api.guguya.com` |
| `GUGUYA_APP_ID` | 应用 AppID（在咕咕丫个人设置 -> API 应用中创建） | `app_a1b2c3d4e5f6g7h8` |
| `GUGUYA_APP_KEY` | 应用 AppKey（仅创建时可见，请妥善保存） | `sk-xxxxxxxxxxxxxxxx` |

> 在咕咕丫 Web 端：**系统设置 -> API 应用 -> 创建应用**，即可获取 AppID 和 AppKey。

## 函数执行逻辑

当 Copaw/OpenClaw 调用 `guguya_skill` 函数时，根据 `action` 参数执行对应操作：

### action = "query" — 知识库对话

1. 如果有 dataset_id 直接用，如果只有 knowledge_base，先调用列表接口查找 ID
2. `GET {GUGUYA_API_BASE}/api/datasets` + `Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}`，找到匹配 knowledge_base 名称的知识库
3. `POST {GUGUYA_API_BASE}/api/chat` 传入 `{"question": "<query>", "datasetIds": ["<id>"], "mode": "knowledge"}`
4. 返回 AI 回答内容

### action = "create_knowledge" — 创建知识

`POST {GUGUYA_API_BASE}/api/knowledge` + `{"type": "text", "title": "<title>", "content": "<content>"}`
返回创建的知识 ID 和标题。

### action = "create_dataset" — 创建知识库

`POST {GUGUYA_API_BASE}/api/datasets` + `{"name": "<name>"}`
返回创建的知识库 ID 和名称。

### action = "list_datasets" — 获取知识库列表

`GET {GUGUYA_API_BASE}/api/datasets`
返回知识库列表，包含 _id、name、knowledgeCount。

### action = "add_to_dataset" — 将知识添加到知识库

1. 如果没有 dataset_id，先查询列表找到 knowledge_base 对应的 ID
2. `POST {GUGUYA_API_BASE}/api/knowledge/batch/add-to-dataset` + `{"knowledgeIds": ["<knowledge_id>"], "datasetId": "<id>"}`
返回添加成功的确认信息。

## 请求规范

- **认证 Header**：`Authorization: AppKey {GUGUYA_APP_ID}:{GUGUYA_APP_KEY}`
- **Content-Type**：`application/json`

## 功能说明

1. **创建知识** — 将文本内容保存为知识条目
2. **创建知识库** — 新建知识库并命名
3. **添加到知识库** — 将知识条目关联到指定知识库
4. **知识对话** — 与指定知识库进行 AI 问答
5. **查看知识库列表** — 列出当前用户的所有知识库

## 错误处理

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| 401 | AppKey 无效或已失效 | 提示用户检查 GUGUYA_APP_ID 和 GUGUYA_APP_KEY 配置是否正确 |
| 403 | 无权限操作该知识库 | 提示用户检查是否有协作权限，或订阅是否有效 |
| 429 | 超出对话配额 | 提示用户当日对话次数已用完，次日重置 |
| 404 | 知识或知识库不存在 | 提示用户检查 ID 是否正确 |
| 500 | 服务器内部错误 | 提示用户稍后重试 |

## 使用示例

**保存知识**：用户说「帮我记一下：React 18 的 useTransition 可以标记低优先级状态更新」
→ 调用 create_knowledge，title=「React 18 useTransition」，content=原文

**与知识库对话**：用户说「在易经八方知识库里查一下坤卦含义」
→ 先调用 list_datasets 找到「易经八方」的 ID，再调用 query 对话

**创建知识库**：用户说「新建一个叫前端技术笔记的知识库」
→ 调用 create_dataset，name=「前端技术笔记」

## 补充说明

- **知识处理时间**：创建知识后，系统会异步进行内容解析和向量化（通常 10-60 秒），完成后才能被检索到
- **知识库范围**：如果 AppKey 创建时绑定了特定知识库，则所有操作仅限该知识库
- **协作与订阅**：对话时支持用户有权访问的所有知识库（自有、协作、订阅），通过传入正确的 datasetId 即可
