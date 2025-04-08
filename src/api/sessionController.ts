// @ts-ignore
/* eslint-disable */
import request from "../libs/request";

/** getNote GET /api/sessions/${param0}/getNote */
export async function getNoteUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getNoteUsingGETParams,
  options?: { [key: string]: any }
) {
  const { sessionId: param0, ...queryParams } = params;
  return request<API.BaseResponseString_>(`/api/sessions/${param0}/getNote`, {
    method: "GET",
    params: { ...queryParams },
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
  return request<API.SseEmitter>(`/api/sessions/${param0}/sendRPC`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    params: {
      // message has a default value: 解析以上内容
      message: "解析以上内容",
      ...queryParams,
    },
    data: body,
    ...(options || {}),
  });
}

/** updateNote PUT /api/sessions/${param0}/upNote */
export async function updateNoteUsingPut(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.updateNoteUsingPUTParams,
  body: string,
  options?: { [key: string]: any }
) {
  const { sessionId: param0, ...queryParams } = params;
  return request<API.BaseResponseSessions_>(`/api/sessions/${param0}/upNote`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    params: { ...queryParams },
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
  return request<API.BaseResponseSessions_>("/api/sessions/create", {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** deleteSession POST /api/sessions/deleteSession */
export async function deleteSessionUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteSessionUsingPOSTParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean_>("/api/sessions/deleteSession", {
    method: "POST",
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
  return request<API.SessionMessages[]>("/api/sessions/getSessionMessages", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** getSessionMessagesByTimeStamp GET /api/sessions/getSessionMessagesByTimeStamp */
export async function getSessionMessagesByTimeStampUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getSessionMessagesByTimeStampUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.SessionMessages[]>(
    "/api/sessions/getSessionMessagesByTimeStamp",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** getSessions GET /api/sessions/getSessions */
export async function getSessionsUsingGet(options?: { [key: string]: any }) {
  return request<API.BaseResponseListSessions_>("/api/sessions/getSessions", {
    method: "GET",
    ...(options || {}),
  });
}
