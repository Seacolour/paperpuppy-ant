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
  MenuFoldOutlined
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
  ChatSession
} from '../store/sessionSlice';
import { createEmptySession } from '../store/messageSlice';
import { useAppSelector } from '../store';
import { message } from 'antd';

const { Search } = Input;
const { Text, Title } = Typography;

// 模拟数据：按时间分组
const mockSessions: ChatSession[] = [
  {
    id: 1,
    name: '研究文献分析',
    lastMessage: '请帮我总结这篇论文的主要观点',
    timestamp: '09:15',
    pinned: true,
    group: '今天'
  },
  {
    id: 2,
    name: '论文写作助手',
    lastMessage: '如何改进我的研究方法部分？',
    timestamp: '昨天',
    starred: true,
    group: '昨天'
  },
  {
    id: 3,
    name: '数据分析讨论',
    lastMessage: '这组数据的统计显著性如何检验？',
    timestamp: '星期一',
    group: '本周'
  },
  {
    id: 4,
    name: '会议摘要准备',
    lastMessage: '帮我修改这段会议摘要',
    timestamp: '3月20日',
    group: '更早'
  },
  {
    id: 5,
    name: '项目计划书草稿',
    lastMessage: '请帮我优化项目背景的表述方式',
    timestamp: '3月15日',
    group: '更早'
  },
];

interface SidebarProps {
  onSelectSession: (sessionId: number) => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  onClearSession?: () => void;
  currentSessionId?: number;
}

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

  // 切换设置菜单的显示状态
  const toggleSettingsMenu = () => {
    setSettingsVisible(!settingsVisible);
  };
  
  // 阻止设置菜单自动关闭
  const handleSettingsMenuClick = (e: any) => {
    e.domEvent.stopPropagation();
  };

  // 搜索会话
  const handleSearch = (value: string) => {
    setSearchValue(value);
  };

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

  // 删除会话
  const handleDeleteSession = (sessionId: number) => {
    dispatch(deleteSession(sessionId));
    // 如果删除的是当前会话，选择第一个会话
    if (sessionId === activeSessionId && filteredSessions.length > 1) {
      const nextSession = filteredSessions.find(session => session.id !== sessionId);
      if (nextSession) {
        dispatch(setActiveSessionId(nextSession.id));
        onSelectSession(nextSession.id);
      }
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
          onClick={(e) => handleMenuItemClick(e.domEvent, () => handleDeleteSession(session.id))}
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
          <Button 
            type="text" 
            icon={<PlusOutlined />} 
            onClick={handleCreateSession}
            className="sidebar-collapse-button"
          />
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
              <Text type="secondary" className="user-email">user@example.com</Text>
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default Sidebar; 