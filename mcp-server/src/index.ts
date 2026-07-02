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
  // ── 内容工坊工具 ──────────────────────────────────────────
  {
    name: "upload_image",
    description: "上传图片到咕咕丫（返回图片公网 URL）。支持 base64 图片数据，用于在创建内容前先把图片上传获取 URL，再将 URL 作为附件传给 create_content。",
    inputSchema: {
      type: "object",
      properties: {
        base64_data: {
          type: "string",
          description: "图片的 base64 编码数据（必填）。可包含或不包含 data:image/xxx;base64, 前缀，均可识别。",
        },
        filename: {
          type: "string",
          description: "图片文件名（选填，如 image.png）。不填时自动生成。",
        },
      },
      required: ["base64_data"],
    },
  },
  {
    name: "create_content",
    description: "将文案/脚本/素材存入咕咕丫内容工坊，支持指定目标渠道（朋友圈、公众号、小红书等）和内容用途，支持附带图片附件。如有本地图片，请先调用 upload_image 上传获取 URL 后再传入 attachments。",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "内容标题（必填，50字以内）",
        },
        content: {
          type: "string",
          description: "内容正文（必填，支持 HTML 或纯文本）",
        },
        channel: {
          type: "string",
          description: "目标渠道：moments(朋友圈)/wechat_official(公众号)/xiaohongshu(小红书)/zhihu(知乎)/douyin(抖音)/bilibili(B站)/weibo(微博)/video_account(视频号)/toutiao(今日头条)/custom(自定义)",
          enum: ["moments", "wechat_official", "xiaohongshu", "zhihu", "toutiao", "douyin", "bilibili", "weibo", "video_account", "custom"],
        },
        purpose: {
          type: "string",
          description: "内容用途：brand(品牌宣传)/product(产品推广)/knowledge(知识分享)/personal_ip(个人IP)/marketing(活动营销)/crm(客户维护)/internal(内部沟通)",
          enum: ["brand", "product", "knowledge", "personal_ip", "marketing", "crm", "internal"],
        },
        tags: {
          type: "array",
          description: "自定义标签",
          items: { type: "string" },
        },
        attachments: {
          type: "array",
          description: "图片附件列表（选填）。每项为 { fileUrl, fileName, fileType }。fileUrl 需为公网可访问的图片地址，可通过 upload_image 工具先上传获取。",
          items: {
            type: "object",
            properties: {
              fileUrl: { type: "string", description: "图片公网 URL（必填）" },
              fileName: { type: "string", description: "文件名（选填）" },
              fileType: { type: "string", description: "文件类型，如 image（选填，默认 image）" },
            },
            required: ["fileUrl"],
          },
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "query_content",
    description: "查询咕咕丫内容工坊中的内容列表，支持按渠道、状态、关键词搜索。",
    inputSchema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "搜索关键词（标题和内容）",
        },
        channel: {
          type: "string",
          description: "渠道筛选",
          enum: ["moments", "wechat_official", "xiaohongshu", "zhihu", "toutiao", "douyin", "bilibili", "weibo", "video_account", "custom"],
        },
        status: {
          type: "string",
          description: "状态筛选：draft(草稿)/published(已发布)/pending_publish(待发布)/archived(已归档)",
          enum: ["draft", "published", "pending_publish", "archived"],
        },
        page: {
          type: "number",
          description: "页码，默认1",
        },
        pageSize: {
          type: "number",
          description: "每页数量，默认20",
        },
      },
      required: [],
    },
  },
  {
    name: "update_content_status",
    description: "更新咕咕丫内容工坊中内容的状态（归档/发布/草稿等）。",
    inputSchema: {
      type: "object",
      properties: {
        content_id: {
          type: "string",
          description: "内容条目 ID（必填）",
        },
        status: {
          type: "string",
          description: "目标状态（必填）：draft(草稿)/published(已发布)/pending_publish(待发布)/archived(已归档)",
          enum: ["draft", "published", "pending_publish", "archived"],
        },
      },
      required: ["content_id", "status"],
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

// ── 内容工坊处理器 ──────────────────────────────────────────

async function handleUploadImage(args: {
  base64_data: string;
  filename?: string;
}): Promise<string> {
  // 兼容带/不带 data:image/xxx;base64, 前缀
  let base64Data = args.base64_data.trim();
  const dataUrlMatch = base64Data.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
  if (dataUrlMatch) {
    base64Data = dataUrlMatch[1];
  }

  const res = await request("POST", "/api/upload/base64", {
    base64Data,
    folder: "content-studio/images",
  }) as {
    data?: { url?: string; filename?: string; size?: number; contentType?: string };
  };

  const data = res?.data || {};
  if (!data.url) throw new Error("上传成功但未返回图片 URL");

  return `✅ 图片上传成功！\nURL：${data.url}\n文件名：${args.filename || data.filename || ""}\n大小：${data.size ? Math.round(data.size / 1024) + "KB" : "未知"}`;
}

async function handleCreateContent(args: {
  title: string;
  content: string;
  channel?: string;
  purpose?: string;
  tags?: string[];
  attachments?: Array<{ fileUrl: string; fileName?: string; fileType?: string }>;
}): Promise<string> {
  const body: Record<string, unknown> = {
    title: args.title,
    content: args.content,
  };
  if (args.channel) body.channel = args.channel;
  if (args.purpose) body.purpose = args.purpose;
  if (args.tags && args.tags.length > 0) body.tags = args.tags;
  if (args.attachments && args.attachments.length > 0) {
    body.attachments = args.attachments.map((a, i) => ({
      fileUrl: a.fileUrl,
      fileName: a.fileName || `image-${i + 1}`,
      fileType: a.fileType || "image",
      sortOrder: i,
    }));
  }

  const res = await request("POST", "/api/content-studio/items", body) as {
    data?: { _id?: string; title?: string; status?: string };
    _id?: string;
  };

  const id = res?.data?._id || (res as { _id?: string })?._id;
  const savedTitle = res?.data?.title || args.title;
  const channelMap: Record<string, string> = {
    moments: "朋友圈", wechat_official: "公众号", xiaohongshu: "小红书",
    zhihu: "知乎", douyin: "抖音", bilibili: "B站",
    weibo: "微博", video_account: "视频号", toutiao: "今日头条", custom: "自定义",
  };
  const channelName = args.channel ? channelMap[args.channel] || args.channel : "未指定";
  return `✅ 内容已存入内容工坊！\n标题：${savedTitle}\nID：${id}\n目标渠道：${channelName}`;
}

async function handleQueryContent(args: {
  keyword?: string;
  channel?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<string> {
  const params = new URLSearchParams();
  if (args.keyword) params.set("search", args.keyword);
  if (args.channel) params.set("channel", args.channel);
  if (args.status) params.set("status", args.status);
  params.set("page", String(args.page || 1));
  params.set("pageSize", String(args.pageSize || 20));

  const res = await request("GET", `/api/content-studio/items?${params.toString()}`) as {
    data?: {
      items?: Array<{ _id: string; title: string; status: string; channels?: Array<{ channel: string }>; updatedAt?: string }>;
      total?: number;
    };
  };

  const items = res?.data?.items || [];
  const total = res?.data?.total || 0;

  if (items.length === 0) return "内容工坊中暂无匹配的内容。";

  const channelMap: Record<string, string> = {
    moments: "朋友圈", wechat_official: "公众号", xiaohongshu: "小红书",
    zhihu: "知乎", douyin: "抖音", bilibili: "B站",
    weibo: "微博", video_account: "视频号", toutiao: "今日头条", custom: "自定义",
  };
  const statusMap: Record<string, string> = {
    draft: "草稿", published: "已发布", pending_publish: "待发布", archived: "已归档",
  };

  const lines = items.map((item, i) => {
    const channels = (item.channels || []).map((c) => channelMap[c.channel] || c.channel).join("、") || "无";
    const status = statusMap[item.status] || item.status;
    return `${i + 1}. 【${item.title}】 ID: ${item._id}  状态: ${status}  渠道: ${channels}`;
  });

  return `共找到 ${total} 条内容：\n\n${lines.join("\n")}`;
}

async function handleUpdateContentStatus(args: {
  content_id: string;
  status: string;
}): Promise<string> {
  const res = await request("PATCH", `/api/content-studio/items/${args.content_id}`, {
    status: args.status,
  }) as {
    data?: { _id?: string; title?: string; status?: string };
  };

  const title = res?.data?.title || "";
  const statusMap: Record<string, string> = {
    draft: "草稿", published: "已发布", pending_publish: "待发布", archived: "已归档",
  };
  const statusName = statusMap[args.status] || args.status;
  return `✅ 内容状态已更新！\n标题：${title}\nID：${args.content_id}\n新状态：${statusName}`;
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
      case "upload_image":
        result = await handleUploadImage(safeArgs as Parameters<typeof handleUploadImage>[0]);
        break;
      case "create_content":
        result = await handleCreateContent(safeArgs as Parameters<typeof handleCreateContent>[0]);
        break;
      case "query_content":
        result = await handleQueryContent(safeArgs as Parameters<typeof handleQueryContent>[0]);
        break;
      case "update_content_status":
        result = await handleUpdateContentStatus(safeArgs as Parameters<typeof handleUpdateContentStatus>[0]);
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
