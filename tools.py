import os
import requests
from typing import Optional, Dict, Any, List


def guguya_skill(
    action: str,
    query: Optional[str] = None,
    knowledge_base: Optional[str] = None,
    dataset_id: Optional[str] = None,
    title: Optional[str] = None,
    content: Optional[str] = None,
    name: Optional[str] = None,
    knowledge_id: Optional[str] = None,
) -> str:
    """
    咕咕丫知识库操作函数。
    支持：query(知识库对话) | create_knowledge(创建知识) | create_dataset(创建知识库) |
          list_datasets(获取知识库列表) | add_to_dataset(将知识添加到知识库)

    Args:
        action: 操作类型
        query: 对话内容或查询问题（action=query 时必填）
        knowledge_base: 知识库名称
        dataset_id: 知识库ID
        title: 知识标题（action=create_knowledge 时使用）
        content: 知识内容（action=create_knowledge 时必填）
        name: 知识库名称（action=create_dataset 时必填）
        knowledge_id: 知识ID（action=add_to_dataset 时必填）

    Returns:
        操作结果字符串
    """
    api_base = os.environ.get("GUGUYA_API_BASE", "").rstrip("/")
    app_id = os.environ.get("GUGUYA_APP_ID", "")
    app_key = os.environ.get("GUGUYA_APP_KEY", "")

    if not api_base or not app_id or not app_key:
        return "错误：请先在 CoPaw 环境变量中配置 GUGUYA_API_BASE、GUGUYA_APP_ID 和 GUGUYA_APP_KEY"

    headers = {
        "Authorization": f"AppKey {app_id}:{app_key}",
        "Content-Type": "application/json",
    }

    try:
        if action == "list_datasets":
            resp = requests.get(f"{api_base}/api/datasets", headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            datasets = data.get("data", data) if isinstance(data, dict) else data
            if not datasets:
                return "暂无知识库"
            lines = [f"共 {len(datasets)} 个知识库："]
            for ds in datasets:
                lines.append(f"- [{ds.get('_id', '')}] {ds.get('name', '')}（{ds.get('knowledgeCount', 0)} 条知识）")
            return "\n".join(lines)

        elif action == "query":
            if not query:
                return "错误：action=query 时 query 参数必填"
            # 如果没有 dataset_id，通过 knowledge_base 名称查找
            if not dataset_id and knowledge_base:
                dataset_id = _find_dataset_id(api_base, headers, knowledge_base)
                if not dataset_id:
                    return f"错误：未找到名为「{knowledge_base}」的知识库"
            payload: Dict[str, Any] = {"question": query, "mode": "knowledge"}
            if dataset_id:
                payload["datasetIds"] = [dataset_id]
            resp = requests.post(f"{api_base}/api/chat", json=payload, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            answer = data.get("answer") or data.get("data", {}).get("answer") or str(data)
            return answer

        elif action == "create_knowledge":
            if not content:
                return "错误：action=create_knowledge 时 content 参数必填"
            payload = {"type": "text", "title": title or content[:30], "content": content}
            resp = requests.post(f"{api_base}/api/knowledge", json=payload, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            kid = data.get("_id") or data.get("data", {}).get("_id", "")
            ktitle = data.get("title") or data.get("data", {}).get("title", title)
            return f"知识创建成功！ID: {kid}，标题: {ktitle}"

        elif action == "create_dataset":
            if not name:
                return "错误：action=create_dataset 时 name 参数必填"
            payload = {"name": name}
            resp = requests.post(f"{api_base}/api/datasets", json=payload, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            did = data.get("_id") or data.get("data", {}).get("_id", "")
            dname = data.get("name") or data.get("data", {}).get("name", name)
            return f"知识库创建成功！ID: {did}，名称: {dname}"

        elif action == "add_to_dataset":
            if not knowledge_id:
                return "错误：action=add_to_dataset 时 knowledge_id 参数必填"
            if not dataset_id and knowledge_base:
                dataset_id = _find_dataset_id(api_base, headers, knowledge_base)
                if not dataset_id:
                    return f"错误：未找到名为「{knowledge_base}」的知识库"
            if not dataset_id:
                return "错误：请提供 dataset_id 或 knowledge_base"
            payload = {"knowledgeIds": [knowledge_id], "datasetId": dataset_id}
            resp = requests.post(
                f"{api_base}/api/knowledge/batch/add-to-dataset",
                json=payload,
                headers=headers,
                timeout=15,
            )
            resp.raise_for_status()
            return f"已成功将知识（{knowledge_id}）添加到知识库（{dataset_id}）"

        else:
            return f"错误：不支持的 action 类型「{action}」，可选值：query | create_knowledge | create_dataset | list_datasets | add_to_dataset"

    except requests.HTTPError as e:
        status = e.response.status_code if e.response else "unknown"
        if status == 401:
            return "错误 401：AppKey 无效或已失效，请检查 GUGUYA_APP_ID 和 GUGUYA_APP_KEY 配置"
        elif status == 403:
            return "错误 403：无权限操作该知识库，请检查协作权限或订阅状态"
        elif status == 429:
            return "错误 429：超出对话配额，当日对话次数已用完，次日重置"
        elif status == 404:
            return "错误 404：知识或知识库不存在，请检查 ID 是否正确"
        return f"请求失败（HTTP {status}）：{str(e)}"
    except Exception as e:
        return f"执行出错：{str(e)}"


def _find_dataset_id(api_base: str, headers: dict, knowledge_base: str) -> Optional[str]:
    """通过知识库名称查找对应的 ID"""
    try:
        resp = requests.get(f"{api_base}/api/datasets", headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        datasets = data.get("data", data) if isinstance(data, dict) else data
        for ds in datasets:
            if ds.get("name") == knowledge_base:
                return ds.get("_id")
    except Exception:
        pass
    return None
