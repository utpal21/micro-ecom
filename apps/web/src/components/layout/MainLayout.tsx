/**
 * MainLayout Component
 * Main application layout with sidebar, header, and content area
 */

import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import Sidebar from './Sidebar';
import Header from './Header';

const { Content } = Layout;

const MainLayout: React.FC = () => {
    const collapsed = useAppSelector((state) => (state as any).ui.sidebarCollapsed);

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sidebar />

            <Layout
                style={{
                    marginLeft: collapsed ? 80 : 256,
                    transition: 'margin-left 0.2s',
                    minHeight: '100vh',
                }}
            >
                <Header />

                <Content
                    style={{
                        margin: '24px',
                        padding: 24,
                        minHeight: 'calc(100vh - 112px)',
                        background: '#f0f2f5',
                        marginTop: 88,
                    }}
                >
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;