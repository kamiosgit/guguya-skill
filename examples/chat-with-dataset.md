# 示例：与知识库对话

## 场景

你已有一个咕咕丫知识库，里面存储了大量笔记和资料，现在想通过 AI Agent 直接查询这些知识。

## 使用示例

### 基础查询（使用默认知识库）

```
用户输入：
  在咕咕丫里查一下，Redux Toolkit 的 createSlice 怎么定义初始状态？

Agent 执行：
  调用接口：
  POST https://api.guguya.com/api/chat/stream
  Authorization: AppKey app_xxx:sk-xxx
  {
    "question": "Redux Toolkit 的 createSlice 怎么定义初始状态？",
    "mode": "knowledge"
  }

Agent 输出（流式）：
  根据您的知识库内容...
  createSlice 接受一个配置对象，其中 initialState 字段定义初始状态：
  ...（来自您保存的知识）
```

### 指定知识库查询

```
用户输入：
  在「前端技术笔记」这个知识库里查一下 useCallback 和 useMemo 的区别

Agent 执行：
  1. 查询知识库列表找到「前端技术笔记」的 ID：
     GET https://api.guguya.com/api/datasets

  2. 发起知识库对话：
     POST https://api.guguya.com/api/chat/stream
     {
       "question": "useCallback 和 useMemo 的区别",
       "datasetIds": ["65e1234567890abcdef"],
       "mode": "knowledge"
     }

  3. 流式输出 AI 基于知识库内容的回答
```

### 与协作知识库对话

```
用户输入：
  在「团队共享文档」里查一下我们的代码规范

Agent 执行：
  （同指定知识库查询，传入协作知识库的 datasetId 即可）
  Agent 可以访问你被邀请加入的协作知识库
```

### 与订阅知识库对话

```
用户输入：
  问一下「Python 进阶课程」（我订阅的那个）里面有没有讲装饰器

Agent 执行：
  （传入订阅知识库的 datasetId）
  Agent 可以访问你付费订阅的知识库
```

## 注意事项

- **知识处理延迟**：刚创建的知识需要 10-60 秒完成向量化，之后才能被检索到
- **对话配额**：每日对话次数取决于你的咕咕丫会员套餐
- **知识库权限**：只能访问自有、协作（被邀请）、订阅（有效订阅）的知识库
