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
    channel: Optional[str] = None,
    purpose: Optional[str] = None,
    tags: Optional[List[str]] = None,
    content_id: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    base64_data: Optional[str] = None,
    filename: Optional[str] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """
    咕咕丫知识库与内容工坊操作函数。
    支持：query(知识库对话) | create_knowledge(创建知识) | create_dataset(创建知识库) |
          list_datasets(获取知识库列表) | add_to_dataset(将知识添加到知识库) |
          upload_image(上传图片) | create_content(创建内容，支持图片附件) |
          query_content(查询内容) | update_content_status(更新内容状态)

    Args:
        action: 操作类型
        query: 对话内容或查询问题（action=query 时必填）
        knowledge_base: 知识库名称
        dataset_id: 知识库ID
        title: 知识标题或内容标题
        content: 知识内容或内容正文
        name: 知识库名称（action=create_dataset 时必填）
        knowledge_id: 知识ID（action=add_to_dataset 时必填）
        channel: 目标渠道（moments/wechat_official/xiaohongshu/zhihu/douyin/bilibili/weibo/video_account/toutiao/custom）
        purpose: 内容用途（brand/product/knowledge/personal_ip/marketing/crm/internal）
        tags: 自定义标签列表
        content_id: 内容条目ID（action=update_content_status 时必填）
        status: 目标状态（draft/published/pending_publish/archived）
        keyword: 搜索关键词（action=query_content 时使用）
        page: 页码，默认1
        page_size: 每页数量，默认20
        base64_data: 图片 base64 编码数据（action=upload_image 时必填，可含或不含 data:image/xxx;base64, 前缀）
        filename: 图片文件名（action=upload_image 时选填）
        attachments: 图片附件列表（action=create_content 时选填），每项含 fileUrl(必填)/fileName(选填)/fileType(选填)

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

        elif action == "upload_image":
            if not base64_data:
                return "错误：action=upload_image 时 base64_data 必填"
            # 兼容带/不带 data:image/xxx;base64, 前缀
            b64 = base64_data.strip()
            import re
            m = re.match(r"^data:image/[a-zA-Z]+;base64,(.+)$", b64)
            if m:
                b64 = m.group(1)
            resp = requests.post(
                f"{api_base}/api/upload/base64",
                json={"base64Data": b64, "folder": "content-studio/images"},
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            img_data = data.get("data", data)
            img_url = img_data.get("url", "")
            if not img_url:
                return "错误：上传成功但未返回图片 URL"
            return f"图片上传成功！URL: {img_url}，文件名: {filename or img_data.get('filename', '')}"

        elif action == "create_content":
            if not title or not content:
                return "错误：action=create_content 时 title 和 content 必填"
            payload: Dict[str, Any] = {"title": title, "content": content}
            if channel:
                payload["channel"] = channel
            if purpose:
                payload["purpose"] = purpose
            if tags:
                payload["tags"] = tags
            if attachments:
                payload["attachments"] = [
                    {
                        "fileUrl": a.get("fileUrl", ""),
                        "fileName": a.get("fileName", f"image-{i + 1}"),
                        "fileType": a.get("fileType", "image"),
                        "sortOrder": i,
                    }
                    for i, a in enumerate(attachments)
                    if a.get("fileUrl")
                ]
            resp = requests.post(f"{api_base}/api/content-studio/items", json=payload, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            cid = data.get("_id") or data.get("data", {}).get("_id", "")
            ctitle = data.get("title") or data.get("data", {}).get("title", title)
            channel_map = {
                "moments": "朋友圈", "wechat_official": "公众号", "xiaohongshu": "小红书",
                "zhihu": "知乎", "douyin": "抖音", "bilibili": "B站",
                "weibo": "微博", "video_account": "视频号", "toutiao": "今日头条", "custom": "自定义",
            }
            ch_name = channel_map.get(channel, channel or "未指定")
            return f"内容已存入内容工坊！ID: {cid}，标题: {ctitle}，目标渠道: {ch_name}"

        elif action == "query_content":
            params: Dict[str, Any] = {"page": page or 1, "pageSize": page_size or 20}
            if keyword:
                params["search"] = keyword
            if channel:
                params["channel"] = channel
            if status:
                params["status"] = status
            resp = requests.get(f"{api_base}/api/content-studio/items", params=params, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            payload_data = data.get("data", data)
            items = payload_data.get("items", []) if isinstance(payload_data, dict) else []
            total = payload_data.get("total", 0) if isinstance(payload_data, dict) else 0
            if not items:
                return "内容工坊中暂无匹配的内容"
            status_map = {
                "draft": "草稿", "published": "已发布", "pending_publish": "待发布", "archived": "已归档",
            }
            lines = [f"共找到 {total} 条内容："]
            for item in items:
                s = status_map.get(item.get("status", ""), item.get("status", ""))
                channels_list = item.get("channels", [])
                ch_names = ",".join(c.get("channel", "") for c in channels_list) if channels_list else "无"
                lines.append(f"- [{item.get('_id', '')}] {item.get('title', '')}  状态: {s}  渠道: {ch_names}")
            return "\n".join(lines)

        elif action == "update_content_status":
            if not content_id or not status:
                return "错误：action=update_content_status 时 content_id 和 status 必填"
            payload = {"status": status}
            resp = requests.patch(
                f"{api_base}/api/content-studio/items/{content_id}",
                json=payload,
                headers=headers,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            ctitle = data.get("title") or data.get("data", {}).get("title", "")
            status_map = {
                "draft": "草稿", "published": "已发布", "pending_publish": "待发布", "archived": "已归档",
            }
            s_name = status_map.get(status, status)
            return f"内容状态已更新！ID: {content_id}，标题: {ctitle}，新状态: {s_name}"

        else:
            return f"错误：不支持的 action 类型「{action}」，可选值：query | create_knowledge | create_dataset | list_datasets | add_to_dataset | upload_image | create_content | query_content | update_content_status"

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
