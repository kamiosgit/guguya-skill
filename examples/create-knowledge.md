# 示例：创建知识并添加到知识库

## 场景

你在和 AI 对话时，想把某段重要内容保存到咕咕丫知识库，以便后续检索。

## 配置准备

1. 登录咕咕丫 Web 端
2. 进入「个人设置 → API 应用」
3. 点击「创建应用」，填写名称（如「我的 OpenClaw 接入」）
4. 复制 AppID 和 AppKey
5. 在 OpenClaw 中配置：
   ```
   GUGUYA_APP_ID=app_xxxxxxxxxxxxxxxx
   GUGUYA_APP_KEY=sk-xxxxxxxxxxxxxxxx
   GUGUYA_API_BASE=https://api.guguya.com
   ```

## 使用示例

```
用户输入：
  帮我记录一下：PostgreSQL 的 JSONB 类型支持 GIN 索引，查询 JSON 字段时比 JSON 类型快很多，
  特别适合存储非结构化数据同时又需要高效查询的场景。

Agent 执行：
  1. 识别操作类型：创建知识
  2. 提取标题：「PostgreSQL JSONB 类型与 GIN 索引」
  3. 调用接口：
     POST https://api.guguya.com/api/knowledge
     Authorization: AppKey app_xxx:sk-xxx
     {
       "type": "text",
       "title": "PostgreSQL JSONB 类型与 GIN 索引",
       "content": "PostgreSQL 的 JSONB 类型支持 GIN 索引..."
     }
  4. 返回结果：
     ✅ 已保存知识「PostgreSQL JSONB 类型与 GIN 索引」
     知识 ID：65f1a2b3c4d5e6f7g8h9i0j1
     状态：处理中（约 10-30 秒完成向量化）
```

## 添加到指定知识库

```
用户输入：
  把刚才那条知识添加到「数据库笔记」知识库

Agent 执行：
  1. 查询知识库列表，找到「数据库笔记」的 ID
  2. 调用接口：
     POST https://api.guguya.com/api/knowledge/batch/add-to-dataset
     {
       "knowledgeIds": ["65f1a2b3..."],
       "datasetId": "65e1234567890abcdef"
     }
  3. 返回：✅ 已将知识添加到「数据库笔记」知识库
```
