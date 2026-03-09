#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// ── 读取环境变量 ──────────────────────────────────────────────
const API_BASE = (process.env.GUGUYA_API_BASE || "https://api.guguya.com").replace(/\/$/, "");
const APP_ID = process.env.GUGUYA_APP_ID || "";
const APP_KEY = process.env.GUGUYA_APP_KEY || "";

if (!APP_ID || !APP_KEY) {
  console.error("[guguya-mcp] 错误：请设置环境变量 GUGUYA_APP_ID 和 GUGUYA_APP_KEY");
  process.exit(1);
}

// ── 通用请求函数 ──────────────────────────────────────────────
async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const { default: fetch } = await import("node-fetch");
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `AppKey ${APP_ID}:${APP_KEY}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return json;
}

// ── 工具定义 ──────────────────────────────────────────────────
const TOOLS: Tool[] = [
  {
    name: "list_datasets",
    description: "获取咕咕丫知识库列表，返回所有知识库的 ID、名称和知识数量。",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "query_knowledge",
    description: "与咕咕丫知识库进行 AI 对话问答。需要提供知识库名称或 ID，以及要提问的内容。",
    inputSchema: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "要向知识库提问的问题或对话内容",
        },
        dataset_id: {
          type: "string",
          description: "知识库 ID（优先使用，如不知道可只传 knowledge_base 名称）",
        },
        knowledge_base: {
          type: "string",
          description: "知识库名称（会自动查找对应 ID）",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "create_knowledge",
    description: "在咕咕丫中创建一条知识，将文本内容保存为知识条目。",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "知识内容（必填）",
        },
        title: {
          type: "string",
          description: "知识标题（选填，不填时从内容中自动提取）",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "create_dataset",
    description: "在咕咕丫中创建一个新的知识库。",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "知识库名称（必填）",
        },
        description: {
          type: "string",
          description: "知识库描述（选填）",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_knowledge_to_dataset",
    description: "将已创建的知识条目添加到指定的知识库中。",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_id: {
          type: "string",
          description: "知识条目 ID（必填）",
        },
        dataset_id: {
          type: "string",
          description: "目标知识库 ID（优先使用）",
        },
        knowledge_base: {
          type: "string",
          description: "目标知识库名称（会自动查找对应 ID）",
        },
      },
      required: ["knowledge_id"],
    },
  },
];

// ── 工具辅助：按名称查找知识库 ID ─────────────────────────────
async function findDatasetId(name: string): Promise<string> {
  const res = await request("GET", "/api/datasets") as { data?: Array<{ _id: string; name: string }> };
  const list = res?.data || (res as Array<{ _id: string; name: string }>);
  if (!Array.isArray(list)) throw new Error("获取知识库列表失败");

  const matched = list.find((d) => d.name === name || d.name.includes(name));
  if (!matched) throw new Error(`未找到名称包含"${name}"的知识库，请先使用 list_datasets 查看可用知识库`);
  return matched._id;
}

// ── 工具处理器 ────────────────────────────────────────────────
async function handleListDatasets(): Promise<string> {
  const res = await request("GET", "/api/datasets") as { data?: Array<{ _id: string; name: string; knowledgeCount?: number }> };
  const list = res?.data || (res as Array<{ _id: string; name: string; knowledgeCount?: number }>);
  if (!Array.isArray(list) || list.length === 0) return "当前账号没有知识库。";

  const lines = list.map((d, i) => `${i + 1}. 【${d.name}】 ID: ${d._id}  知识数量: ${d.knowledgeCount ?? 0}`);
  return `共找到 ${list.length} 个知识库：\n\n${lines.join("\n")}`;
}

async function handleQueryKnowledge(args: {
  question: string;
  dataset_id?: string;
  knowledge_base?: string;
}): Promise<string> {
  let datasetId = args.dataset_id;

  if (!datasetId) {
    if (!args.knowledge_base) {
      // 不指定知识库，全局查询
      const res = await request("POST", "/api/chat", {
        question: args.question,
        mode: "knowledge",
      }) as { data?: { answer?: string }; answer?: string };
      return res?.data?.answer || (res as { answer?: string })?.answer || JSON.stringify(res);
    }
    datasetId = await findDatasetId(args.knowledge_base);
  }

  const res = await request("POST", "/api/chat", {
    question: args.question,
    datasetIds: [datasetId],
    mode: "knowledge",
  }) as { data?: { answer?: string }; answer?: string };

  return res?.data?.answer || (res as { answer?: string })?.answer || JSON.stringify(res);
}

async function handleCreateKnowledge(args: {
  content: string;
  title?: string;
}): Promise<string> {
  // 没有标题时从内容中取前20字
  const title = args.title || args.content.slice(0, 20).replace(/\n/g, " ").trim();

  const res = await request("POST", "/api/knowledge", {
    type: "text",
    title,
    content: args.content,
  }) as { data?: { _id?: string; title?: string }; _id?: string };

  const id = res?.data?._id || (res as { _id?: string })?._id;
  const savedTitle = res?.data?.title || title;
  return `✅ 知识已创建成功！\n标题：${savedTitle}\nID：${id}\n\n（知识正在异步向量化，通常 10-60 秒后可被检索）`;
}

async function handleCreateDataset(args: {
  name: string;
  description?: string;
}): Promise<string> {
  const res = await request("POST", "/api/datasets", {
    name: args.name,
    description: args.description || "",
  }) as { data?: { _id?: string; name?: string }; _id?: string };

  const id = res?.data?._id || (res as { _id?: string })?._id;
  return `✅ 知识库创建成功！\n名称：${args.name}\nID：${id}`;
}

async function handleAddToDataset(args: {
  knowledge_id: string;
  dataset_id?: string;
  knowledge_base?: string;
}): Promise<string> {
  let datasetId = args.dataset_id;

  if (!datasetId) {
    if (!args.knowledge_base) throw new Error("请提供 dataset_id 或 knowledge_base 名称");
    datasetId = await findDatasetId(args.knowledge_base);
  }

  await request("POST", "/api/knowledge/batch/add-to-dataset", {
    knowledgeIds: [args.knowledge_id],
    datasetId,
  });

  return `✅ 知识已成功添加到知识库！\n知识 ID：${args.knowledge_id}\n知识库 ID：${datasetId}`;
}

// ── MCP Server 初始化 ─────────────────────────────────────────
const server = new Server(
  { name: "guguya-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const safeArgs = (args || {}) as Record<string, unknown>;

  try {
    let result: string;

    switch (name) {
      case "list_datasets":
        result = await handleListDatasets();
        break;
      case "query_knowledge":
        result = await handleQueryKnowledge(safeArgs as Parameters<typeof handleQueryKnowledge>[0]);
        break;
      case "create_knowledge":
        result = await handleCreateKnowledge(safeArgs as Parameters<typeof handleCreateKnowledge>[0]);
        break;
      case "create_dataset":
        result = await handleCreateDataset(safeArgs as Parameters<typeof handleCreateDataset>[0]);
        break;
      case "add_knowledge_to_dataset":
        result = await handleAddToDataset(safeArgs as Parameters<typeof handleAddToDataset>[0]);
        break;
      default:
        throw new Error(`未知工具：${name}`);
    }

    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `❌ 操作失败：${msg}` }],
      isError: true,
    };
  }
});

// ── 启动 ──────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[guguya-mcp] 已启动，API: ${API_BASE}, AppID: ${APP_ID}`);
}

main().catch((err) => {
  console.error("[guguya-mcp] 启动失败：", err);
  process.exit(1);
});
