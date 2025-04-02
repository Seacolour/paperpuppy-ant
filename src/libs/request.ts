import axios, { AxiosRequestConfig } from "axios";

// 创建一个请求记录对象，用于跟踪正在进行的请求
const pendingRequests = new Map();

// 创建 Axios 示例
const myAxios = axios.create({
  baseURL: "http://localhost:8101",
  timeout: 10000,
  withCredentials: true,
});

// 生成请求的唯一键
const generateRequestKey = (config: AxiosRequestConfig) => {
  const { url, method, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

// 请求拦截器
myAxios.interceptors.request.use(
  (config) => {
    // 添加Accept头部，支持多种响应类型
    if (!config.headers['Accept']) {
      config.headers['Accept'] = 'application/json, text/plain, text/event-stream, */*';
    }
    
    // 添加认证令牌
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 防止重复请求 (可选功能)
    const requestKey = generateRequestKey(config);
    if (pendingRequests.has(requestKey)) {
      const controller = pendingRequests.get(requestKey);
      controller.abort();
      pendingRequests.delete(requestKey);
    }
    
    const controller = new AbortController();
    config.signal = controller.signal;
    pendingRequests.set(requestKey, controller);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
myAxios.interceptors.response.use(
  (response) => {
    // 请求完成后，删除请求记录
    const requestKey = generateRequestKey(response.config);
    pendingRequests.delete(requestKey);
    
    // 处理响应数据
    return response;
  },
  (error) => {
    // 请求失败时，删除请求记录
    if (error.config) {
      const requestKey = generateRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }
    
    // 处理错误信息
    return Promise.reject(error);
  }
);

export default myAxios;
