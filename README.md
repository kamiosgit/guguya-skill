# 📚 guguya-skill

咕咕丫 (Guguya) 智能 AI Agent 技能包 — 让 AI Agent 能创建知识、管理知识库、与知识库 AI 对话。

支持所有主流 AI Agent 平台（QwenPaw、QClaw、Minimax MaxClaw、Kimi Claw、OpenClaw 等），同时提供 MCP Server 供 Claude Desktop、Cursor 等 MCP 客户端使用。

---

## 快速开始

### 1. 获取 API 凭证

在咕咕丫 Web 端：**个人设置 → API 应用 → 创建应用**，获取 `AppID` 和 `AppKey`。

### 2. 配置环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GUGUYA_API_BASE` | API 服务地址（可选，有默认值） | `https://api.guguya.com` |
| `GUGUYA_APP_ID` | 应用 AppID | `app_a1b2c3d4e5f6g7h8` |
| `GUGUYA_APP_KEY` | 应用 AppKey（仅创建时可见） | `sk-xxxxxxxxxxxxxxxx` |

---

## 使用方式

### 方式一：配置型技能（SKILL.md）

适用于 OpenClaw / QwenPaw / Kimi Claw 等支持技能配置的 AI Agent 平台。

将本仓库作为技能导入平台，AI Agent 会根据 [SKILL.md](./SKILL.md) 中的指令，使用平台内置的 HTTP 请求能力调用咕咕丫 API。

**支持的操作：**

| 操作 | 说明 |
|------|------|
| 创建知识 | 将文本内容保存为知识条目 |
| 创建知识库 | 新建知识库并命名 |
| 将知识添加到知识库 | 关联知识条目到指定知识库 |
| 与知识库对话 | 对指定知识库进行 AI 问答 |
| 获取知识库列表 | 列出当前用户的所有知识库 |

详见 [SKILL.md](./SKILL.md)。

### 方式二：MCP Server

适用于 Claude Desktop、Cursor、Windsurf 等 MCP 客户端。

```bash
cd mcp-server
npm install
npm run build
```

在 MCP 客户端配置中添加：

```json
{
  "mcpServers": {
    "guguya": {
      "command": "node",
      "args": ["/path/to/guguya-skill/mcp-server/dist/index.js"],
      "env": {
        "GUGUYA_API_BASE": "https://api.guguya.com",
        "GUGUYA_APP_ID": "your-app-id",
        "GUGUYA_APP_KEY": "your-app-key"
      }
    }
  }
}
```

### 方式三：Python 函数调用

适用于 CoPaw 等支持 Python 函数的 AI Agent 平台。

```python
from tools import guguya_skill

# 创建知识
result = guguya_skill(action="create_knowledge", content="要保存的内容", title="标题")

# 与知识库对话
result = guguya_skill(action="query", query="你的问题", knowledge_base="知识库名称")
```

---

## 项目结构

```
guguya-skill/
├── SKILL.md              # 配置型技能描述（适用于 OpenClaw 等）
├── tools.py              # Python 函数实现（适用于 CoPaw 等）
├── __init__.py           # Python 模块声明
├── mcp-server/           # MCP Server 实现
│   ├── src/index.ts      # TypeScript 源码
│   ├── package.json
│   └── tsconfig.json
└── examples/             # 使用示例
    ├── chat-with-dataset.md
    └── create-knowledge.md
```

---

## 错误处理

| 错误码 | 含义 | 处理建议 |
|--------|------|----------|
| 401 | AppKey 无效或已失效 | 检查 GUGUYA_APP_ID 和 GUGUYA_APP_KEY 配置 |
| 403 | 无权限操作该知识库 | 检查协作权限或订阅状态 |
| 429 | 超出对话配额 | 当日对话次数已用完，次日重置 |
| 404 | 知识或知识库不存在 | 检查 ID 是否正确 |
| 500 | 服务器内部错误 | 稍后重试 |

---

## License

MIT
