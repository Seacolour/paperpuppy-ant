import React, { useState } from 'react';
import { Button, Form, Input, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { UserAPI } from '../utils/api-helper';
import '../styles/Register.css';

const { Title } = Typography;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const onFinish = async (values: {
    userAccount: string;
    userPassword: string;
    confirmPassword: string;
    email?: string;
  }) => {
    try {
      setLoading(true);
      const { userAccount, userPassword, confirmPassword, email } = values;
      
      // 密码一致性检查（虽然表单验证也会检查）
      if (userPassword !== confirmPassword) {
        message.error('两次输入的密码不一致');
        return;
      }
      
      const success = await UserAPI.register(userAccount, userPassword, confirmPassword, email);
      
      if (success) {
        message.success('注册成功，正在跳转到登录页面...');
        // 使用replace方式跳转到登录页面
        setTimeout(() => {
          window.location.replace('/login');
        }, 800);
      } else {
        message.error('注册失败，请稍后重试');
      }
    } catch (error) {
      console.error('注册失败:', error);
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <Card className="register-card">
        <div className="register-header">
          <Title level={2}>创建账号</Title>
          <p className="register-subtitle">加入PaperPuppy，提升您的研究效率</p>
        </div>
        
        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="userAccount"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 4, message: '用户名至少4个字符' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="邮箱（选填）" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="userPassword"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('userPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              className="register-form-button"
              loading={loading}
              size="large"
              block
            >
              注册
            </Button>
            已有账号？ <Link to="/login">立即登录</Link>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Register; 