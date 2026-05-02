/**
 * Dashboard Page
 * Main dashboard with statistics cards and charts
 */

import { useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Spin, Alert } from 'antd';
import {
    ShoppingOutlined,
    ShoppingCartOutlined,
    UserOutlined,
    DollarOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/common';

const { Title } = Typography;

interface DashboardStats {
    totalVendors: number;
    totalProducts: number;
    totalOrders: number;
    totalUsers: number;
    revenue: number;
    ordersToday: number;
    revenueToday: number;
}

const DashboardPage: React.FC = () => {
    // Mock data - in production, this would come from API
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats>({
        totalVendors: 156,
        totalProducts: 2340,
        totalOrders: 12456,
        totalUsers: 45678,
        revenue: 1234567,
        ordersToday: 234,
        revenueToday: 45678,
    });

    // Mock growth percentages
    const growth = {
        vendors: 12.5,
        products: 8.3,
        orders: 15.7,
        users: 22.1,
        revenue: 18.9,
    };

    const formatCurrency = (value: any) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Number(value));
    };

    const formatNumber = (value: any) => {
        return new Intl.NumberFormat('en-US').format(Number(value));
    };

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Welcome back! Here's what's happening with your store today."
            />

            {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <Row gutter={[16, 16]}>
                    {/* Total Vendors */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Vendors"
                                value={stats.totalVendors}
                                prefix={<ShoppingOutlined style={{ color: '#1677ff' }} />}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> {growth.vendors}%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Total Products */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Products"
                                value={stats.totalProducts}
                                prefix={<ShoppingCartOutlined style={{ color: '#52c41a' }} />}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> {growth.products}%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Total Orders */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Orders"
                                value={stats.totalOrders}
                                prefix={<ShoppingCartOutlined style={{ color: '#faad14' }} />}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> {growth.orders}%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Total Users */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Users"
                                value={stats.totalUsers}
                                prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> {growth.users}%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Total Revenue */}
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Total Revenue"
                                value={stats.revenue}
                                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                                formatter={formatCurrency}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> {growth.revenue}%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Orders Today */}
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Orders Today"
                                value={stats.ordersToday}
                                prefix={<ShoppingCartOutlined style={{ color: '#faad14' }} />}
                                formatter={formatNumber}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> 5.2%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Revenue Today */}
                    <Col xs={24} sm={12} lg={8}>
                        <Card>
                            <Statistic
                                title="Revenue Today"
                                value={stats.revenueToday}
                                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                                formatter={formatCurrency}
                                valueStyle={{ color: '#262626' }}
                                suffix={
                                    <span style={{ fontSize: 14, color: '#52c41a' }}>
                                        <ArrowUpOutlined /> 8.7%
                                    </span>
                                }
                            />
                        </Card>
                    </Col>

                    {/* Recent Activity Alert */}
                    <Col xs={24}>
                        <Alert
                            message="System Status"
                            description="All systems are operational. Last backup completed 2 hours ago. Next scheduled maintenance: Sunday 2:00 AM UTC."
                            type="success"
                            showIcon
                        />
                    </Col>
                </Row>
            )}
        </div>
    );
};

export default DashboardPage;