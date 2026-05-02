/**
 * Header Component
 * Top navigation bar with user menu, notifications, and theme toggle
 */

import { Layout, Breadcrumb, Dropdown, Avatar, Badge, Space, Button, Drawer, List, Typography, Empty, type MenuProps } from 'antd';
import {
    BellOutlined,
    UserOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    SunOutlined,
    MoonOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout, selectUser } from '../../store/slices/authSlice';
import { markAsRead, clearAll } from '../../store/slices/notificationSlice';
import { useState } from 'react';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
    className?: string;
}

const Header: React.FC<HeaderProps> = ({ className }) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const collapsed = useAppSelector((state) => (state as any).ui.sidebarCollapsed);
    const notifications = useAppSelector((state) => (state as any).notifications.notifications);
    const unreadCount = useAppSelector((state) => (state as any).notifications.unreadCount);
    const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
            onClick: () => navigate('/profile'),
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            onClick: () => navigate('/settings'),
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            danger: true,
            onClick: handleLogout,
        },
    ];

    const handleNotificationClick = (id: string) => {
        dispatch(markAsRead(id));
    };

    const handleClearAll = () => {
        dispatch(clearAll());
    };

    const renderNotificationItem = (item: any) => (
        <List.Item
            key={item.id}
            onClick={() => handleNotificationClick(item.id)}
            style={{
                cursor: 'pointer',
                backgroundColor: item.read ? 'transparent' : '#f0f9ff',
                padding: '12px 16px',
            }}
        >
            <List.Item.Meta
                title={
                    <Space>
                        <Text strong={!item.read}>{item.title}</Text>
                        {!item.read && <Badge status="processing" />}
                    </Space>
                }
                description={
                    <div>
                        <Text type="secondary">{item.message}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(item.createdAt).toLocaleString()}
                        </Text>
                    </div>
                }
            />
        </List.Item>
    );

    return (
        <>
            <AntHeader
                className={className}
                style={{
                    padding: '0 24px',
                    background: '#fff',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'fixed',
                    top: 0,
                    left: collapsed ? 80 : 256,
                    right: 0,
                    zIndex: 10,
                    transition: 'left 0.2s',
                }}
            >
                {/* Left Side */}
                <Space>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => dispatch(toggleSidebar())}
                        style={{ fontSize: 16, width: 48, height: 48 }}
                    />
                    <Breadcrumb style={{ marginLeft: 16 }}>
                        <Breadcrumb.Item>Home</Breadcrumb.Item>
                        <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
                    </Breadcrumb>
                </Space>

                {/* Right Side */}
                <Space size="middle">
                    {/* Notifications */}
                    <Badge count={unreadCount} size="small">
                        <Button
                            type="text"
                            icon={<BellOutlined style={{ fontSize: 18 }} />}
                            onClick={() => setNotificationDrawerOpen(true)}
                            style={{ width: 48, height: 48 }}
                        />
                    </Badge>

                    {/* User Menu */}
                    <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                        <Space style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 8 }}>
                            <Avatar
                                size={32}
                                icon={<UserOutlined />}
                                src={user?.avatar}
                                style={{ backgroundColor: '#1677ff' }}
                            />
                            <Text strong>{user?.name || 'User'}</Text>
                        </Space>
                    </Dropdown>
                </Space>
            </AntHeader>

            {/* Notification Drawer */}
            <Drawer
                title={
                    <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Text strong>Notifications</Text>
                        {notifications.length > 0 && (
                            <Button type="link" size="small" onClick={handleClearAll}>
                                Clear All
                            </Button>
                        )}
                    </Space>
                }
                placement="right"
                width={400}
                onClose={() => setNotificationDrawerOpen(false)}
                open={notificationDrawerOpen}
            >
                {notifications.length === 0 ? (
                    <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={notifications}
                        renderItem={renderNotificationItem}
                    />
                )}
            </Drawer>
        </>
    );
};

export default Header;