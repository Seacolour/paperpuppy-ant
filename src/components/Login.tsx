import React, { useState, useEffect, useRef } from 'react';
import { Button, Form, Input, Card, Typography, Checkbox, message, Tabs, Space, Row, Col, Modal, Image } from 'antd';
import { UserOutlined, LockOutlined, MobileOutlined, KeyOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { UserAPI } from '../utils/api-helper';
import '../styles/Login.css';

const { Title } = Typography;
const { TabPane } = Tabs;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [mobileForm] = Form.useForm();
  const navigate = useNavigate();
  const [loginType, setLoginType] = useState<string>('account');
  const [countdown, setCountdown] = useState<number>(0);
  const [sendingCode, setSendingCode] = useState<boolean>(false);
  
  // 处理倒计时
  useEffect(() => {
    let interval: number | undefined;
    if (countdown > 0) {
      interval = window.setInterval(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdown]);
  
  // 账号密码登录
  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    try {
      setLoading(true);
      const { username, password, remember } = values;
      
      // 开发环境记录日志
      if (process.env.NODE_ENV === 'development') {
        console.log('正在登录:', username);
      }
      
      // 尝试进行API登录
      const userInfo = await UserAPI.login(username, password);
      
      if (userInfo) {
        if (remember) {
          // 如果勾选了"记住我"，可以存储用户名（不要存储密码）
          localStorage.setItem('rememberedUsername', username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }
        
        message.success('登录成功！');
        
        // 添加延迟确保UI显示成功消息
        setTimeout(() => {
          try {
            // 使用简单方式跳转
            window.location.href = '/';
          } catch (e) {
            // 备用跳转方法
            window.location.replace('/');
          }
        }, 1000);
      } else {
        message.error('登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('登录失败:', error);
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 手机验证码登录
  const onMobileFinish = async (values: { mobile: string; code: string; remember: boolean }) => {
    try {
      setLoading(true);
      const { mobile, code, remember } = values;
      
      // 打印表单数据帮助调试
      console.log('提交的表单数据:', values);
      
      // 开发环境记录日志
      if (process.env.NODE_ENV === 'development') {
        console.log('正在手机验证码登录:', mobile, '验证码:', code);
      }
      
      // 调用API进行手机号验证码登录
      const userInfo = await UserAPI.loginWithMobile(mobile, code);
      
      if (userInfo) {
        if (remember) {
          localStorage.setItem('rememberedMobile', mobile);
        } else {
          localStorage.removeItem('rememberedMobile');
        }
        
        message.success('登录成功！');
        
        setTimeout(() => {
          try {
            window.location.href = '/';
          } catch (e) {
            window.location.replace('/');
          }
        }, 1000);
      } else {
        // 登录失败时显示更具体的错误信息，而不是泛泛的提示
        message.error('验证码错误或已过期，请重新获取');
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // 发送验证码流程（直接发送，无需图形验证码）
  const sendVerificationCode = async () => {
    try {
      // 先验证手机号格式
      await mobileForm.validateFields(['mobile']);
      const mobile = mobileForm.getFieldValue('mobile');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('正在发送验证码到手机号:', mobile);
      }
      
      setSendingCode(true);
      
      // 调用API发送验证码，不传入图形验证码
      const success = await UserAPI.sendVerificationCode(mobile);
      
      if (success) {
        // 设置倒计时
        setCountdown(60);
        message.success(`验证码已发送至 ${mobile}，有效期为5分钟`);
      } else {
        // 即使API调用成功但返回失败状态，也应当显示提示
        message.error('验证码发送失败，请稍后重试');
      }
    } catch (error: any) {
      console.error('发送验证码失败:', error);
      if (error instanceof Error) {
        message.error(error.message);
      } else if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('发送验证码失败，请稍后重试');
      }
    } finally {
      setSendingCode(false);
    }
  };
  
  // 切换登录方式
  const handleLoginTypeChange = (type: string) => {
    setLoginType(type);
  };
  
  const rememberUsername = localStorage.getItem('rememberedUsername') || '';
  const rememberMobile = localStorage.getItem('rememberedMobile') || '';

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <Title level={2}>欢迎使用 PaperPuppy</Title>
          <p className="login-subtitle">AI学术助手，激发您的研究潜能</p>
        </div>
        
        <Tabs activeKey={loginType} onChange={handleLoginTypeChange} centered className="login-tabs">
          <TabPane tab="账号密码登录" key="account">
            <Form
              form={form}
              name="login"
              initialValues={{ username: rememberUsername, remember: !!rememberUsername }}
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input 
                  prefix={<UserOutlined />} 
                  placeholder="用户名" 
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Row justify="space-between">
                  <Col>
                    <Form.Item name="remember" valuePropName="checked" noStyle>
                      <Checkbox>记住我</Checkbox>
                    </Form.Item>
                  </Col>
                  <Col>
                    <Link to="/forgot-password" className="login-form-forgot">
                      忘记密码
                    </Link>
                  </Col>
                </Row>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className="login-form-button"
                  loading={loading}
                  size="large"
                  block
                >
                  登录
                </Button>
                <div className="login-form-register">
                  或者 <Link to="/register">立即注册</Link>
                </div>
              </Form.Item>
            </Form>
          </TabPane>
          
          <TabPane tab="手机验证码登录" key="mobile">
            <Form
              form={mobileForm}
              name="mobileLogin"
              initialValues={{ mobile: rememberMobile, remember: !!rememberMobile }}
              onFinish={onMobileFinish}
              autoComplete="off"
              layout="vertical"
            >
              <Form.Item
                name="mobile"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                ]}
              >
                <Input 
                  prefix={<MobileOutlined />} 
                  placeholder="手机号" 
                  size="large"
                />
              </Form.Item>

              <Row gutter={8}>
                <Col span={16}>
                  <Form.Item
                    name="code"
                    rules={[
                      { required: true, message: '请输入验证码' },
                      { pattern: /^\d{6}$/, message: '验证码为6位数字' }
                    ]}
                  >
                    <Input
                      prefix={<KeyOutlined />}
                      placeholder="验证码"
                      size="large"
                      maxLength={6}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={sendVerificationCode}
                    loading={sendingCode}
                    disabled={countdown > 0}
                    style={{ width: '100%', height: '40px' }}
                  >
                    {countdown > 0 ? `${countdown}秒后重发` : '获取验证码'}
                  </Button>
                </Col>
              </Row>

              <Form.Item>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住我</Checkbox>
                </Form.Item>
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className="login-form-button"
                  loading={loading}
                  size="large"
                  block
                >
                  登录
                </Button>
                <div className="login-form-register">
                  或者 <Link to="/register">立即注册</Link>
                </div>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Login; 