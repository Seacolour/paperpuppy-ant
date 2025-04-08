// @ts-ignore
/* eslint-disable */
import request from "../libs/request";

/** cancelSubscription POST /api/subscription/cancel */
export async function cancelSubscriptionUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.cancelSubscriptionUsingPOSTParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserSubscription_>(
    "/api/subscription/cancel",
    {
      method: "POST",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** renewSubscription POST /api/subscription/renew */
export async function renewSubscriptionUsingPost(
  body: API.SubscriptionRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserSubscription_>("/api/subscription/renew", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** checkVIPStatus GET /api/subscription/status */
export async function checkVipStatusUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.checkVIPStatusUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserSubscription_>(
    "/api/subscription/status",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** subscribe POST /api/subscription/subscribe */
export async function subscribeUsingPost(
  body: API.SubscriptionRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseUserSubscription_>(
    "/api/subscription/subscribe",
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
