import React, { useState, useEffect } from 'react';
import { Menu, Button, Input, Modal, List, Typography, Dropdown, Space, Empty, Divider, Tag, Avatar, Switch } from 'antd';
import { 
  PlusOutlined, 
  MessageOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined, 
  SearchOutlined,
  PushpinOutlined,
  PushpinFilled,
  StarOutlined,
  StarFilled,
  SettingOutlined,
  DownOutlined,
  UserOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  MenuFoldOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import '../styles/Sidebar.css';
import { useDispatch } from 'react-redux';
import { 
  addSession, 
  deleteSession, 
  setActiveSessionId, 
  toggleGrouped, 
  toggleMoreInfo, 
  toggleSessionPinned, 
  toggleSessionStarred,
  ChatSession,
  setSessions
} from '../store/sessionSlice';
import { createEmptySession, clearSessionMessages } from '../store/messageSlice';
import { useAppSelector } from '../store';
import { message } from 'antd';
import { deleteSessionUsingPost, getSessionsUsingGet } from '../api/sessionController';

const { Search } = Input;
const { Text, Title } = Typography;

// 会话数据由Redux管理

interface SidebarProps {
  onSelectSession: (sessionId: number) => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  onClearSession?: () => void;
  currentSessionId?: number;
}

// 使用表单直接提交删除请求的函数
const submitDeleteForm = async (sessionId: number | string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      console.log('[表单提交] 开始创建表单删除会话，ID:', sessionId);
      
      // 使用fetch API发送请求
      console.log('[表单提交] 使用fetch发送请求');
      
      fetch(`http://192.168.50.140/api/sessions/deleteSession?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      })
      .then(response => {
        console.log('[表单提交] fetch响应状态:', response.status);
        if (response.ok) {
          response.json().then(data => {
            console.log('[表单提交] fetch响应数据:', data);
            resolve(true);
          }).catch(error => {
            console.error('[表单提交] 解析响应JSON失败:', error);
            tryXHR();
          });
        } else {
          console.error('[表单提交] 请求失败，状态码:', response.status);
          tryXHR();
        }
      })
      .catch(error => {
        console.error('[表单提交] fetch请求失败:', error);
        tryXHR();
      });
      
      // 如果fetch失败，使用XMLHttpRequest作为最后的后备
      function tryXHR() {
        console.log('[XHR] 尝试使用XMLHttpRequest发送请求');
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `http://192.168.50.140/api/sessions/deleteSession?sessionId=${sessionId}`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('userToken')}`);
        
        xhr.onload = function() {
          console.log('[XHR] 响应状态:', xhr.status);
          console.log('[XHR] 响应内容:', xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            resolve(false);
          }
        };
        
        xhr.onerror = function() {
          console.error('[XHR] 请求失败');
          resolve(false);
        };
        
        xhr.send();
      }
    } catch (error) {
      console.error('[表单提交] 创建表单出错:', error);
      resolve(false);
    }
  });
};

const Sidebar: React.FC<SidebarProps> = ({ 
  onSelectSession, 
  onLogout, 
  onToggleSidebar,
  onClearSession,
  currentSessionId
}) => {
  // 使用Redux状态
  const dispatch = useDispatch();
  const { sessions, activeSessionId, showGrouped, showMoreInfo } = useAppSelector(
    (state) => state.sessions
  );
  
  // 获取当前会话的消息
  const currentSessionMessages = useAppSelector(state => 
    state.messages.messages[activeSessionId || 1] || []
  );
  
  const [searchValue, setSearchValue] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 切换设置菜单的显示状态
  const toggleSettingsMenu = () => {
    setSettingsVisible(!settingsVisible);
  };
  
  // 刷新会话列表
  const refreshSessions = async () => {
    setIsRefreshing(true);
    // 创建取消控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
    
    try {
      const response = await getSessionsUsingGet({
        options: {
          signal: controller.signal
        }
      });
      clearTimeout(timeoutId);
      
      const sessionList = response?.data?.data || [];
      if (sessionList && sessionList.length > 0) {
        // 保存旧ID映射关系
        const oldIdMap = new Map();
        sessions.forEach(session => {
          if (session.backendSessionId) {
            oldIdMap.set(session.backendSessionId, session.id);
          }
        });

        // 将后端返回的会话列表转换为本地格式，并保持ID映射
        const formattedSessions = sessionList.map(session => {
          // 查找已存在的前端ID
          const existingFrontendId = oldIdMap.get(session.id);
          
          return {
            id: existingFrontendId || Date.now() + Math.floor(Math.random() * 1000), // 保持前端ID或创建新ID
            name: session.sessionName || '未命名会话',
            backendSessionId: session.id,
            lastMessage: '会话已刷新', // 固定文本，因为API没有提供lastMessage
            timestamp: session.createTime ? new Date(session.createTime).toLocaleString() : '刚刚',
            pinned: false, // API没有提供pinned字段，默认为false
            starred: false // API没有提供starred字段，默认为false
          };
        });

        // 使用Redux的setSessions action更新会话列表
        dispatch(setSessions(formattedSessions));
        message.success('会话列表已刷新');
      } else {
        message.info('没有获取到会话');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      // 检查是否是取消错误，如果是，则不显示错误提示
      if (error.name === 'CanceledError' || error.name === 'AbortError') {
        console.log('会话刷新请求被取消');
      } else {
        console.error('刷新会话列表失败:', error);
        message.error('刷新会话列表失败');
      }
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // 阻止设置菜单自动关闭
  const handleSettingsMenuClick = (e: any) => {
    e.domEvent.stopPropagation();
  };

  // 搜索会话
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

  // 页面加载时自动获取会话列表
  useEffect(() => {
    // 组件挂载时自动刷新会话列表
    refreshSessions();
    
    // 可以在这里设置定时刷新，例如每5分钟
    const refreshInterval = setInterval(refreshSessions, 5 * 60 * 1000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [dispatch]); // 添加dispatch到依赖项中
  
  // 过滤会话列表
  const filteredSessions = sessions.filter(session => 
    session.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  // 创建新会话
  const handleCreateSession = () => {
    // 检查当前会话是否为空（新会话）
    const currentSession = sessions.find(s => s.id === activeSessionId);
    
    const isEmptyCurrentSession = 
      currentSessionMessages.length === 0 && 
      currentSession?.name === "PaperPuppy";
    
    if (isEmptyCurrentSession) {
      // 使用全局消息显示
      message.info('您已处于新的会话中');
      return;
    }
    
    const newSessionId = Date.now();
    const newSession: ChatSession = {
      id: newSessionId,
      name: "PaperPuppy",
      lastMessage: '新建会话',
      timestamp: '刚刚',
      group: '今天'
      // 注意：不设置backendSessionId，表示这是一个前端创建但未经后端确认的会话
    };
    
    dispatch(addSession(newSession));
    dispatch(createEmptySession(newSessionId));
    dispatch(setActiveSessionId(newSessionId));
    onSelectSession(newSessionId);
  };

  // 处理删除会话
  const handleDeleteSession = async (sessionId: number, backendSessionId: number | string | undefined) => {
    try {
      console.log('[删除会话] 开始处理, 前端ID:', sessionId, '后端ID:', backendSessionId);
      
      if (!backendSessionId) {
        console.error('[删除会话] 缺少后端会话ID');
        message.error('无法删除会话：缺少后端会话ID');
        return;
      }
      
      // 显示加载消息
      message.loading('正在删除会话...', 0.5);
      
      // 直接调用API删除会话
      console.log('[删除会话] 调用API删除会话, 后端ID:', backendSessionId);
      const response = await deleteSessionUsingPost({ sessionId: Number(backendSessionId) });
      // 检查响应是否成功
      const deleted = response && response.data && response.data.code === 0;
      console.log('[删除会话] API删除结果:', deleted, response);
      
      if (deleted) {
        // 从缓存中删除会话
        console.log('[删除会话] 从缓存中移除会话');
        
        // 清理localStorage中与该会话相关的数据
        console.log('[删除会话] 清理localStorage中的会话数据, ID:', sessionId);
        
        // 清除需要刷新的标记
        localStorage.removeItem(`session_${sessionId}_needsRefresh`);
        
        // 获取并更新会话加载时间
        const sessionLoadTimesStr = localStorage.getItem('sessionLoadTimes');
        if (sessionLoadTimesStr) {
          try {
            const sessionLoadTimes = JSON.parse(sessionLoadTimesStr);
            if (sessionLoadTimes[sessionId]) {
              delete sessionLoadTimes[sessionId];
              localStorage.setItem('sessionLoadTimes', JSON.stringify(sessionLoadTimes));
            }
          } catch (e) {
            console.error('[删除会话] 解析sessionLoadTimes失败:', e);
          }
        }
        
        // 清除其他可能与会话相关的localStorage数据
        // 遍历localStorage并删除所有以session_{sessionId}开头的项
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`session_${sessionId}`)) {
            localStorage.removeItem(key);
          }
        }
        
        // 从 Redux store 中移除会话
        const sessionsArray = [...sessions];
        const newSessions = sessionsArray.filter(s => s.id !== sessionId);
        dispatch(setSessions(newSessions));
        
        // 从 Redux store 中清除会话消息
        dispatch(clearSessionMessages(sessionId));
        
        // 如果当前活动会话是被删除的会话，切换到默认会话
        if (activeSessionId === sessionId) {
          console.log('[删除会话] 切换到默认会话');
          dispatch(setActiveSessionId(1));
        }
        
        // 显示成功消息
        message.success('会话已成功删除');
      } else {
        console.error('[删除会话] API删除失败');
        message.error('删除会话失败，请稍后重试');
      }
    } catch (error: any) {
      console.error('[删除会话] 处理异常:', error);
      message.error(error?.message || '删除会话失败，请稍后重试');
    }
  };

  // 切换会话置顶状态，确保不会触发会话选择
  const togglePinned = (sessionId: number, e?: React.MouseEvent | React.SyntheticEvent) => {
    // 阻止事件冒泡，防止触发会话选择
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    dispatch(toggleSessionPinned(sessionId));
  };

  // 切换会话星标状态，确保不会触发会话选择
  const toggleStarred = (sessionId: number, e?: React.MouseEvent | React.SyntheticEvent) => {
    // 阻止事件冒泡，防止触发会话选择
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    dispatch(toggleSessionStarred(sessionId));
  };

  // 选择会话
  const handleSelectSession = (sessionId: number) => {
    dispatch(setActiveSessionId(sessionId));
    onSelectSession(sessionId);
  };

  // 渲染会话菜单
  const renderSessionMenu = (session: ChatSession) => {
    const isCurrentSession = currentSessionId === session.id;
    
    const handleMenuItemClick = (
      e: React.MouseEvent | React.KeyboardEvent,
      action: () => void
    ) => {
      e.stopPropagation();
      e.preventDefault();
      action();
      return false;
    };
    
    return (
      <Menu onClick={(e) => e.domEvent.stopPropagation()}>
        <Menu.Item key="pin" onClick={(e) => handleMenuItemClick(e.domEvent, () => togglePinned(session.id))}>
          {session.pinned ? (
            <><PushpinFilled /> 取消置顶</>
          ) : (
            <><PushpinOutlined /> 置顶会话</>
          )}
        </Menu.Item>
        <Menu.Item key="star" onClick={(e) => handleMenuItemClick(e.domEvent, () => toggleStarred(session.id))}>
          {session.starred ? (
            <><StarFilled /> 取消星标</>
          ) : (
            <><StarOutlined /> 标记为星标</>
          )}
        </Menu.Item>
        <Menu.Item key="edit">
          <EditOutlined /> 重命名
        </Menu.Item>
        {isCurrentSession && onClearSession && (
          <Menu.Item key="clear" danger onClick={(e) => handleMenuItemClick(e.domEvent, onClearSession)}>
            <DeleteOutlined /> 清空会话
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item 
          key="delete" 
          danger 
          onClick={(e) => {
            // 添加更多的调试日志
            console.log('删除会话菜单项点击，会话信息:', session);
            console.log('当前登录信息:', {
              token: localStorage.getItem('userToken') ? '已设置token' : '未设置token',
              tokenLength: localStorage.getItem('userToken')?.length || 0
            });
            
            handleMenuItemClick(e.domEvent, () => handleDeleteSession(Number(session.id), session.backendSessionId));
          }}
        >
          <DeleteOutlined /> 删除会话
        </Menu.Item>
      </Menu>
    );
  };

  // 按组渲染会话列表
  const renderGroupedSessions = () => {
    if (!showGrouped) {
      return renderSessionList(filteredSessions);
    }

    // 获取所有分组
    const groups = Array.from(new Set(filteredSessions.map(session => session.group)));
    
    // 如果没有会话，显示空状态
    if (filteredSessions.length === 0) {
      return (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="没有找到会话"
          className="empty-sessions"
        />
      );
    }

    return groups.map(group => {
      const groupSessions = filteredSessions.filter(session => session.group === group);
      if (groupSessions.length === 0) return null;

      return (
        <div key={group} className="session-group">
          <div className="group-title">
            <Text type="secondary">{group}</Text>
          </div>
          {renderSessionList(groupSessions)}
        </div>
      );
    });
  };

  // 渲染会话列表
  const renderSessionList = (sessionList: ChatSession[]) => {
    // 首先渲染置顶的会话
    const pinnedSessions = sessionList.filter(session => session.pinned);
    const normalSessions = sessionList.filter(session => !session.pinned);
    
    const allSessions = [...pinnedSessions, ...normalSessions];

    return (
      <List
        itemLayout="horizontal"
        dataSource={allSessions}
        renderItem={session => (
          <List.Item 
            className={`session-item ${activeSessionId === session.id ? 'active' : ''}`}
            onClick={(e) => {
              // 检查点击事件是否来自图标或操作菜单
              const targetElement = e.target as HTMLElement;
              const isIconOrAction = 
                targetElement.closest('.session-badges') ||
                targetElement.closest('.pin-icon') ||
                targetElement.closest('.star-icon') ||
                targetElement.closest('.session-actions') ||
                targetElement.closest('.more-button');
              
              // 只有当点击不是图标或操作菜单时才选择会话
              if (!isIconOrAction) {
                handleSelectSession(session.id);
              }
            }}
          >
            <div className="session-content">
              <div className="session-info">
                <div className="session-title">
                  <Text strong ellipsis>{session.name}</Text>
                  <div className="session-badges">
                    {session.pinned && <PushpinFilled className="pin-icon clickable" onClick={(e) => {
                      e.stopPropagation();
                      togglePinned(session.id);
                    }} />}
                    {session.starred && <StarFilled className="star-icon clickable" onClick={(e) => {
                      e.stopPropagation();
                      toggleStarred(session.id);
                    }} />}
                  </div>
                </div>
                {showMoreInfo && (
                  <div className="session-desc">
                    <Text type="secondary" ellipsis>
                      {session.lastMessage}
                    </Text>
                    <Text type="secondary" className="session-time">
                      {session.timestamp}
                    </Text>
                  </div>
                )}
              </div>
              <div className="session-actions">
                <Dropdown 
                  overlay={renderSessionMenu(session)}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    size="small"
                    className="more-button"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            </div>
          </List.Item>
        )}
      />
    );
  };

  // 渲染头部工具栏
  const renderHeader = () => {
    return (
      <div className="sidebar-header">
        <div className="header-title">
          <div className="sidebar-toggle-button">
            <Button 
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={onToggleSidebar}
              className="sidebar-collapse-button"
            />
          </div>
          <div className="header-actions">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              size="small"
              onClick={toggleSettingsMenu}
              className="sidebar-collapse-button"
            />
            {settingsVisible && (
              <div className="settings-menu" onClick={(e) => e.stopPropagation()}>
                <Menu selectable={false}>
                  <Menu.Item key="grouped">
                    <div className="setting-item" onClick={(e) => e.stopPropagation()}>
                      <span>按时间分组</span>
                      <Switch 
                        size="small" 
                        checked={showGrouped} 
                        onChange={(checked) => dispatch(toggleGrouped(checked))}
                      />
                    </div>
                  </Menu.Item>
                  <Menu.Item key="showMoreInfo">
                    <div className="setting-item" onClick={(e) => e.stopPropagation()}>
                      <span>显示会话详情</span>
                      <Switch 
                        size="small" 
                        checked={showMoreInfo} 
                        onChange={(checked) => dispatch(toggleMoreInfo(checked))}
                      />
                    </div>
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item key="settings">
                    <SettingOutlined /> 会话设置
                  </Menu.Item>
                </Menu>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button 
              type="text" 
              icon={<ReloadOutlined spin={isRefreshing} />} 
              onClick={refreshSessions}
              className="sidebar-collapse-button"
              title="刷新会话列表"
            />
            <Button 
              type="text" 
              icon={<PlusOutlined />} 
              onClick={handleCreateSession}
              className="sidebar-collapse-button"
              title="新建会话"
            />
          </div>
        </div>
        <div className="header-search">
          <Input
            placeholder="搜索会话"
            onChange={(e) => setSearchValue(e.target.value)}
            prefix={<SearchOutlined />}
            allowClear
          />
        </div>
      </div>
    );
  };

  // 处理退出登录
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // 用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        个人设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  // 在点击其他区域时关闭设置菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isSettingsButton = target.closest('.header-actions button');
      const isSettingsMenu = target.closest('.settings-menu');
      
      if (settingsVisible && !isSettingsButton && !isSettingsMenu) {
        setSettingsVisible(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [settingsVisible]);

  return (
    <div className="sidebar">
      {renderHeader()}

      <div className="session-list-container">
        {renderGroupedSessions()}
      </div>

      <div className="sidebar-footer">
        <Dropdown overlay={userMenu} placement="topRight" arrow>
          <div className="user-profile">
            <Avatar icon={<UserOutlined />} className="user-avatar" />
            <div className="user-info">
              <Text strong>用户名</Text>
              <Text type="secondary" className="user-email"></Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default Sidebar; 