// @ts-ignore
/* eslint-disable */
import request from "@/libs/request";

/** checkUserTokens POST /api/userToken/checkUserTokens */
export async function checkUserTokensUsingPost(
  body: API.UserTokenRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserTokens_>(
    "/api/userToken/checkUserTokens",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** createUserToken POST /api/userToken/createUserToken */
export async function createUserTokenUsingPost(
  body: API.UserTokenRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserTokens_>(
    "/api/userToken/createUserToken",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: body,
      ...(options || {}),
    }
  );
}

/** runTask POST /api/userToken/run */
export async function runTaskUsingPost(options?: { [key: string]: any }) {
  return request<string>("/api/userToken/run", {
    method: "POST",
    ...(options || {}),
  });
}

/** getTokenStatus GET /api/userToken/status */
export async function getTokenStatusUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getTokenStatusUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserTokens_>("/api/userToken/status", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
