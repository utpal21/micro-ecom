/**
 * Login Page
 * User authentication with email and password
 */

import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginSuccess, selectIsLoading, selectError, clearError } from '../../store/slices/authSlice';
import { useLoginMutation } from '../../store/api/apiSlice';

const { Title, Text } = Typography;

interface LoginFormValues {
    email: string;
    password: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(selectIsLoading);
    const error = useAppSelector(selectError);
    const [loginMutation] = useLoginMutation();
    const [form] = Form.useForm();

    // Get redirect path from location state
    const from = (location.state as any)?.from?.pathname || '/dashboard';

    const handleSubmit = async (values: LoginFormValues) => {
        try {
            dispatch(clearError());
            const result = await loginMutation(values).unwrap();

            // Dispatch login success action
            dispatch(
                loginSuccess({
                    user: result.user,
                    token: result.token,
                    refreshToken: result.refreshToken,
                    permissions: result.permissions,
                })
            );

            // Navigate to the page they were trying to access
            navigate(from, { replace: true });
        } catch (err: any) {
            // Error is handled by RTK Query and stored in state
            console.error('Login failed:', err);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 24,
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 400,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* Logo and Title */}
                    <div style={{ textAlign: 'center' }}>
                        <Title level={2} style={{ margin: 0, color: '#1677ff' }}>
                            MicroEcom
                        </Title>
                        <Text type="secondary">Admin Portal</Text>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            message={error}
                            type="error"
                            showIcon
                            closable
                            onClose={() => dispatch(clearError())}
                        />
                    )}

                    {/* Login Form */}
                    <Form
                        form={form}
                        name="login"
                        onFinish={handleSubmit}
                        size="large"
                        autoComplete="off"
                    >
                        <Form.Item
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your email!',
                                },
                                {
                                    type: 'email',
                                    message: 'Please enter a valid email!',
                                },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="Email"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
                                {
                                    min: 6,
                                    message: 'Password must be at least 6 characters!',
                                },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Password"
                                autoComplete="current-password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isLoading}
                                block
                                style={{ height: 48, fontSize: 16 }}
                            >
                                Sign In
                            </Button>
                        </Form.Item>
                    </Form>

                    {/* Footer */}
                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            © 2026 MicroEcom. All rights reserved.
                        </Text>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default LoginPage;