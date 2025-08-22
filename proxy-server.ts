// deno-proxy-server.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const PORT = 31233;
const TARGET_HOST = "https://kilocode.ai";

// 处理代理请求的函数
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // 路由映射
  let targetUrl: string;
  
  if (pathname === "/v1/models") {
    targetUrl = `${TARGET_HOST}/api/openrouter/models`;
  } else if (pathname === "/v1/chat/completions") {
    targetUrl = `${TARGET_HOST}/api/openrouter/chat/completions`;
  } else {
    return new Response("Not Found", { status: 404 });
  }
  
  // 构建代理请求
  const proxyHeaders = new Headers();
  
  // 设置公共请求头
  proxyHeaders.set("Host", "kilocode.ai");
  proxyHeaders.set("HTTP-Referer", "https://kilocode.ai");
  proxyHeaders.set("X-Title", "Kilo Code");
  proxyHeaders.set("X-KiloCode-Version", "4.49.2");
  proxyHeaders.set("User-Agent", "Kilo-Code/4.49.2");
  proxyHeaders.set("X-Accel-Buffering", "no");
  
  // 转发原始请求的 Authorization 头
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    proxyHeaders.set("Authorization", authHeader);
  }
  
  // 转发其他必要的请求头
  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    proxyHeaders.set("Content-Type", contentType);
  }
  
  try {
    // 发送代理请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.body,
    });
    
    const response = await fetch(proxyRequest);
    
    // 构建响应头
    const responseHeaders = new Headers();
    
    // 转发响应头
    response.headers.forEach((value, key) => {
      // 过滤掉一些不需要的头
      if (!["connection", "transfer-encoding", "content-encoding"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    
    // 添加 CORS 头（如果需要）
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error("代理请求失败:", error);
    return new Response("代理服务器错误", { status: 500 });
  }
}

// 启动服务器
console.log(`代理服务器启动在端口 ${PORT}`);
console.log(`访问地址: http://127.0.0.1:${PORT}`);

await serve(handleRequest, { 
  port: PORT,
  hostname: "127.0.0.1"
});
