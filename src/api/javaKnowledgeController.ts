// @ts-ignore
/* eslint-disable */
import request from "@/libs/request";

/** deleteIndex DELETE /api/knowledge/${param0} */
export async function deleteIndexUsingDelete(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteIndexUsingDELETEParams,
  options?: { [key: string]: any }
) {
  const { indexName: param0, ...queryParams } = params;
  return request<string>(`/api/knowledge/${param0}`, {
    method: "DELETE",
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** addFileKnowledge POST /api/knowledge/addFileKnowledge */
export async function addFileKnowledgeUsingPost(
  body: {},
  file?: File,
  options?: { [key: string]: any }
) {
  const formData = new FormData();

  if (file) {
    formData.append("file", file);
  }

  Object.keys(body).forEach((ele) => {
    const item = (body as any)[ele];

    if (item !== undefined && item !== null) {
      if (typeof item === "object" && !(item instanceof File)) {
        if (item instanceof Array) {
          item.forEach((f) => formData.append(ele, f || ""));
        } else {
          formData.append(ele, JSON.stringify(item));
        }
      } else {
        formData.append(ele, item);
      }
    }
  });

  return request<API.BaseResponseString_>("/api/knowledge/addFileKnowledge", {
    method: "POST",
    data: formData,
    requestType: "form",
    ...(options || {}),
  });
}

/** deleteKnowledgeFile DELETE /api/knowledge/delete */
export async function deleteKnowledgeFileUsingDelete(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteKnowledgeFileUsingDELETEParams,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseBoolean_>("/api/knowledge/delete", {
    method: "DELETE",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** deleteKnowledgeFile DELETE /api/knowledge/file */
export async function deleteKnowledgeFileUsingDelete1(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: API.deleteKnowledgeFileUsingDELETE1Params,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseString_>("/api/knowledge/file", {
    method: "DELETE",
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** queryKnowledge POST /api/knowledge/query */
export async function queryKnowledgeUsingPost(
  body: API.KnowledgeSearchRequest,
  options?: { [key: string]: any }
) {
  return request<API.BaseResponseListDocumentEmbedding_>(
    "/api/knowledge/query",
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
