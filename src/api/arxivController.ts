// @ts-ignore
/* eslint-disable */
import request from "../libs/request";

/** getUserAllPaperInfos GET /api/arxiv/getUserAllPaperInfos */
export async function getUserAllPaperInfosUsingGet(options?: {
  [key: string]: any;
}) {
  return request<API.BaseResponseListPaperInfo_>(
    "/api/arxiv/getUserAllPaperInfos",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** getUserAllPaperInfosBySearch GET /api/arxiv/getUserAllPaperInfosBySearch */
export async function getUserAllPaperInfosBySearchUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getUserAllPaperInfosBySearchUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseListPaperInfo_>(
    "/api/arxiv/getUserAllPaperInfosBySearch",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** searchAndSave POST /api/arxiv/search */
export async function searchAndSaveUsingPost(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.searchAndSaveUsingPOSTParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseListPaperInfo_>("/api/arxiv/search", {
    method: "POST",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}
