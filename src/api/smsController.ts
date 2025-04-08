// @ts-ignore
/* eslint-disable */
import request from "../libs/request";

/** getPhoneNumber GET /api/sms/getPhoneNumber */
export async function getPhoneNumberUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getPhoneNumberUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.SendSmsResponse>("/api/sms/getPhoneNumber", {
    method: "GET",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
