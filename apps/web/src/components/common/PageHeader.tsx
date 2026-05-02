/**
 * PageHeader Component
 * Reusable page header with title, subtitle, and actions
 */

import { Breadcrumb, Button, Space, Typography } from 'antd';

const { Title, Text } = Typography;

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumb?: { title: string; path?: string }[];
    actions?: React.ReactNode;
    extra?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    breadcrumb,
    actions,
    extra,
    ...props
}) => {
    return (
        <div style={{ marginBottom: 24 }}>
            {breadcrumb && (
                <Breadcrumb style={{ marginBottom: 16 }}>
                    {breadcrumb.map((item, index) => (
                        <Breadcrumb.Item key={index}>{item.title}</Breadcrumb.Item>
                    ))}
                </Breadcrumb>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0, marginBottom: subtitle ? 8 : 0 }}>
                        {title}
                    </Title>
                    {subtitle && (
                        <Text type="secondary">{subtitle}</Text>
                    )}
                </div>

                {actions && (
                    <Space>{actions}</Space>
                )}
            </div>

            {extra && <div style={{ marginTop: 16 }}>{extra}</div>}
        </div>
    );
};

export default PageHeader;