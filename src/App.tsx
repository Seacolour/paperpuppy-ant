import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css'
import { ConfigProvider, Spin, Button, message } from 'antd'
import zhCN from 'antd/locale/zh_CN';
import Login from './components/Login';
import Register from './components/Register';
import ChatPage from './components/ChatPage';
import { UserAPI } from './utils/api-helper';
import { UserInfo } from './types/api';

// 检查用户是否已登录
const isAuthenticated = () => {
  const token = localStorage.getItem('userToken');
  // 仅在开发环境记录日志
  if (process.env.NODE_ENV === 'development' && token) {
    console.log('[开发] 用户已登录');
  }
  return !!token;
};

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = localStorage.getItem('userToken');
        
        if (token) {
          // 尝试获取当前用户信息验证token有效性
          const userInfo = await UserAPI.getCurrentUser();
          
          if (userInfo) {
            setIsAuth(true);
            if (process.env.NODE_ENV === 'development') {
              console.log('[开发] 验证通过，显示受保护内容');
            }
          } else {
            // token无效，清除并跳转到登录页
            localStorage.removeItem('userToken');
            sessionStorage.removeItem('userInfo');
            message.error('登录状态已失效，请重新登录');
            navigate('/login', { replace: true });
          }
        } else {
          // 没有token，跳转到登录页
          navigate('/login', { replace: true, state: { from: location } });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('验证登录状态出错:', error);
        setIsLoading(false);
        setIsAuth(false);
        navigate('/login', { replace: true });
      }
    };
    
    checkLoginStatus();
  }, [navigate, location]);
  
  // 使用Spin的正确方式，嵌套方式使用tip
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin spinning={true} tip="加载中...">
          <div style={{ width: '100px', height: '100px' }} />
        </Spin>
      </div>
    );
  }
  
  return isAuth ? <>{children}</> : null;
};

function App() {
  // 用户状态
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginCheckCompleted, setLoginCheckCompleted] = useState(false);

  // 检查用户登录状态
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // 先检查本地token
        const token = localStorage.getItem('userToken');
        console.log('[App] 检查Token:', token);
        
        if (!token) {
          console.log('[App] 未找到Token');
          setLoading(false);
          setLoginCheckCompleted(true);
          return;
        }
        
        // 尝试获取真实登录用户信息
        console.log('[App] 发送getCurrentUser请求');
        const userInfo = await UserAPI.getCurrentUser();
        console.log('[App] getCurrentUser响应:', userInfo);
        
        if (userInfo) {
          console.log('[App] 用户已登录:', userInfo);
          setCurrentUser(userInfo);
          message.success('欢迎回来, ' + userInfo.userName);
        } else {
          console.log('[App] 用户信息为空');
          // 如果API返回null但我们有token，可能是token过期
          localStorage.removeItem('userToken');
        }
      } catch (error) {
        console.error('[App] 检查登录状态失败:', error);
        // 出错时清除可能无效的token
        localStorage.removeItem('userToken');
      } finally {
        setLoading(false);
        setLoginCheckCompleted(true);
      }
    };

    checkLoginStatus();
  }, []);

  // 在登录状态检查完成前，显示加载动画
  if (!loginCheckCompleted) {
    return (
      <div className="page-loading">
        <Spin 
          size="large" 
          tip="应用加载中..." 
          wrapperClassName="full-spin-wrapper"
        />
      </div>
    );
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div className="app-container">
        <Router>
          <Routes>
            <Route path="/login" element={
              isAuthenticated() ? <Navigate to="/" replace /> : <Login />
            } />
            <Route path="/register" element={
              isAuthenticated() ? <Navigate to="/" replace /> : <Register />
            } />
            <Route path="/forgot-password" element={
              <div className="page-loading">
                <p>密码重置功能尚未实现</p>
                <Button onClick={() => window.history.back()}>返回</Button>
              </div>
            } />
            <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </div>
    </ConfigProvider>
  );
}

export default App
