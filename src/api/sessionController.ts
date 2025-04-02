// @ts-ignore
/* eslint-disable */
import request from "../libs/request";

/** sendMessage POST /api/sessions/${param0}/message */
export async function sendMessageUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.sendMessageRPCUsingPOSTParams,
  body: {
    /** fileIds */
    fileIds?: string[];
  },
  options?: { [key: string]: any }
) {
  const { sessionId: param0, ...queryParams } = params;
  
  // 获取token并添加到请求选项
  const token = localStorage.getItem('userToken');
  const headers: Record<string, string> = {
    "Content-Type": "multipart/form-data",
    "Accept": "application/json, text/plain, text/event-stream, */*"
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<API.SseEmitter>(`/api/sessions/${param0}/message`, {
    method: "POST",
    headers,
    params: {
      message: queryParams.message || "",
      enableDeepThought: queryParams.enableDeepThought || false,
      enableInternet: queryParams.enableInternet || false,
      useKnowledge: queryParams.useKnowledge || false
    },
    data: body,
    ...(options || {}),
  });
}

/** sendMessageRPC POST /api/sessions/${param0}/sendRPC */
export async function sendMessageRpcUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.sendMessageRPCUsingPOSTParams,
  body: {
    /** file */
    file?: any[];
  },
  options?: { [key: string]: any }
) {
  const { sessionId: param0, ...queryParams } = params;
  
  // 获取token并添加到请求选项
  const token = localStorage.getItem('userToken');
  const headers: Record<string, string> = {
    "Content-Type": "multipart/form-data",
    "Accept": "application/json, text/plain, text/event-stream, */*"
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<API.SseEmitter>(`/api/sessions/${param0}/sendRPC`, {
    method: "POST",
    headers,
    params: {
      // message has a default value: 解析以上内容
      message: "解析以上内容",
      ...queryParams,
    },
    data: body,
    ...(options || {}),
  });
}

/** createSession POST /api/sessions/create */
export async function createSessionUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.createSessionUsingPOSTParams,
  options?: { [key: string]: any }
) {
  const token = localStorage.getItem('userToken');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*"
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<API.BaseResponseSessions_>("/api/sessions/create", {
    method: "POST",
    headers,
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** deleteSession DELETE /api/sessions/delete */
export async function deleteSessionUsingDelete(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteSessionUsingPOSTParams,
  options?: { [key: string]: any }
) {
  const token = localStorage.getItem('userToken');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*"
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<API.BaseResponseBoolean_>("/api/sessions/delete", {
    method: "DELETE",
    headers,
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** getSessionById GET /api/sessions/getSessionById */
export async function getSessionByIdUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getSessionByIdUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseSessions_>("/api/sessions/getSessionById", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** getSessionMessages GET /api/sessions/getSessionMessages */
export async function getSessionMessagesUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getSessionMessagesUsingGETParams,
  options?: { [key: string]: any }
) {
  const token = localStorage.getItem('userToken');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*"
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<API.SessionMessages[]>("/api/sessions/getSessionMessages", {
    method: "GET",
    headers,
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** getSessions GET /api/sessions/getSessions */
export async function getSessionsUsingGet(options?: { [key: string]: any }) {
  const token = localStorage.getItem('userToken');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*"
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return request<API.BaseResponseListSessions_>("/api/sessions/getSessions", {
    method: "GET",
    headers,
    ...(options || {}),
  });
}
