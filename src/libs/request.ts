import axios, { AxiosRequestConfig } from "axios";

// 创建一个请求记录对象，用于跟踪正在进行的请求
const pendingRequests = new Map();

// 创建 Axios 示例
// 根据环境选择合适的baseURL
const myAxios = axios.create({
  baseURL: "http://192.168.50.140", // 包含/api路径前缀，与Nginx配置匹配
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
    
    // 添加详细日志
    console.log('[请求跟踪] 即将发送请求:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      params: config.params,
      headers: config.headers,
      完整URL: (config.baseURL || '') + (config.url || '') + 
             (config.params ? '?' + Object.entries(config.params)
                               .map(([key, value]) => `${key}=${value}`)
                               .join('&') : '')
    });
    
    return config;
  },
  (error) => {
    console.error('[请求跟踪] 请求配置错误:', error);
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
