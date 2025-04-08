// @ts-ignore
/* eslint-disable */
import request from "../libs/request";

/** deleteFile DELETE /api/api/knowledge/sql/delete/${param0} */
export async function deleteFileUsingDelete(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteFileUsingDELETEParams,
  options?: { [key: string]: any }
) {
  const { fileId: param0, ...queryParams } = params;
  return request<API.BaseResponseBoolean_>(
    `/api/api/knowledge/sql/delete/${param0}`,
    {
      method: "DELETE",
      params: {
        ...queryParams,
      },
      ...(options || {}),
    }
  );
}

/** getFile GET /api/api/knowledge/sql/get/${param0} */
export async function getFileUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.getFileUsingGETParams,
  options?: { [key: string]: any }
) {
  const { fileId: param0, ...queryParams } = params;
  return request<API.BaseResponseUserUploadedFiles_>(
    `/api/api/knowledge/sql/get/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** listUserUploadedFiles GET /api/api/knowledge/sql/list */
export async function listUserUploadedFilesUsingGet(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.listUserUploadedFilesUsingGETParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseListUserUploadedFiles_>(
    "/api/api/knowledge/sql/list",
    {
      method: "GET",
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}
