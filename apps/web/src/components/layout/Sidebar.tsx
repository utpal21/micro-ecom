/**
 * Sidebar Component
 * Navigation sidebar with collapsible functionality
 */

import { Layout, Menu } from 'antd';
import {
    DashboardOutlined,
    ShoppingOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    PictureOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import type { MenuProps } from 'antd';

const { Sider } = Layout;

interface SidebarProps {
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();

    // Get sidebar collapsed state directly from Redux
    const collapsed = useAppSelector((state) => (state as any).ui.sidebarCollapsed);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    // Menu items configuration
    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Dashboard',
            onClick: () => navigate('/dashboard'),
        },
        {
            key: '/vendors',
            icon: <ShoppingOutlined />,
            label: 'Vendors',
            onClick: () => navigate('/vendors'),
        },
        {
            key: '/products',
            icon: <PictureOutlined />,
            label: 'Products',
            onClick: () => navigate('/products'),
        },
        {
            key: '/orders',
            icon: <ShoppingCartOutlined />,
            label: 'Orders',
            onClick: () => navigate('/orders'),
        },
        {
            key: '/users',
            icon: <UserOutlined />,
            label: 'Users',
            onClick: () => navigate('/users'),
        },
        {
            type: 'divider',
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            onClick: () => navigate('/settings'),
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            onClick: handleLogout,
            danger: true,
        },
    ];

    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={() => dispatch(toggleSidebar())}
            trigger={null}
            width={256}
            className={className}
            style={{
                overflow: 'auto',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
            }}
        >
            {/* Logo Section */}
            <div
                style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? 0 : '0 24px',
                    borderBottom: '1px solid #f0f0f0',
                }}
            >
                {collapsed ? (
                    <ShoppingOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ShoppingOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                        <span style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>
                            MicroEcom
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation Menu */}
            <Menu
                theme="light"
                mode="inline"
                selectedKeys={[location.pathname]}
                items={menuItems}
                style={{ borderRight: 0, height: 'calc(100vh - 64px)' }}
            />

            {/* Collapse Toggle Button */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    textAlign: 'center',
                    borderTop: '1px solid #f0f0f0',
                    padding: '12px 0',
                    cursor: 'pointer',
                    background: '#fafafa',
                }}
                onClick={() => dispatch(toggleSidebar())}
            >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
        </Sider>
    );
};

export default Sidebar;