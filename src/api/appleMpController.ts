// @ts-ignore
/* eslint-disable */
import request from "@/libs/request";

/** getAppleUserInfo POST /api/apple/user-info */
export async function getAppleUserInfoUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getAppleUserInfoUsingPOSTParams,
  options?: { [key: string]: any }
) {
  return request<Record<string, any>>("/api/apple/user-info", {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
