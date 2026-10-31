import json
import logging
import urllib.request
import asyncio
from app.config import TAVILY_API_KEY

logger = logging.getLogger(__name__)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

async def search_tavily(query: str, max_results: int = 3, domain_filter: list = ["bitsathy.ac.in"]) -> tuple[str, list]:
    """
    Performs real-time web search via Tavily Search API.
    Returns:
        (web_context_text, web_sources_list)
    """
    if not TAVILY_API_KEY or TAVILY_API_KEY.startswith("paste_") or len(TAVILY_API_KEY) < 10:
        return "", []

    # Ensure query includes college context
    search_q = query if "bannari" in query.lower() or "bit" in query.lower() else f"Bannari Amman Institute of Technology {query}"
    
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": search_q,
        "search_depth": "basic",
        "include_answer": True,
        "max_results": max_results,
    }
    
    if domain_filter:
        payload["include_domains"] = domain_filter

    def _sync_post():
        try:
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                TAVILY_SEARCH_URL,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "BIT-AI-Assistant/1.0"}
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                if response.status == 200:
                    return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            logger.warning(f"Tavily API request failed: {e}")
            return None

    try:
        data = await asyncio.to_thread(_sync_post)
        if not data:
            return "", []

        results = data.get("results", [])
        answer = data.get("answer", "")
        
        snippets = []
        sources = []
        
        if answer:
            snippets.append(f"Live Web Answer: {answer}")
            
        for r in results:
            title = r.get("title", "BIT Web Resource")
            url = r.get("url", "")
            content = r.get("content", "")
            if content:
                snippets.append(f"Source ({url}): {content}")
                sources.append({"source": f"Web: {title}", "url": url, "content": content[:200]})
                
        web_context = "\n\n".join(snippets)
        return web_context, sources
        
    except Exception as e:
        logger.error(f"Error in search_tavily: {e}")
        return "", []
