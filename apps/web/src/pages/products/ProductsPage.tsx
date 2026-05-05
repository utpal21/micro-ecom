/**
 * Products Page - Main Container
 * Manages product listings, filtering, and CRUD operations
 */

import { useState } from 'react';
import { Card, Button, Space, Typography, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import ProductsList from './components/ProductsList';
import ProductFormModal from './components/ProductFormModal';
import ProductDetailModal from './components/ProductDetailModal';
import type { Product } from '../../types';

const { Title } = Typography;

const ProductsPage: React.FC = () => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleCreateProduct = () => {
        setSelectedProduct(null);
        setIsFormModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsFormModalOpen(true);
    };

    const handleViewProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsDetailModalOpen(true);
    };

    const handleFormSuccess = () => {
        setIsFormModalOpen(false);
        setSelectedProduct(null);
        setRefreshKey((prev) => prev + 1);
        message.success('Product saved successfully');
    };

    const handleDeleteSuccess = () => {
        setRefreshKey((prev) => prev + 1);
        message.success('Product deleted successfully');
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <Title level={2} style={{ margin: 0 }}>
                                Products
                            </Title>
                            <Typography.Text type="secondary">
                                Manage your product catalog
                            </Typography.Text>
                        </div>
                        <Space>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => setRefreshKey((prev) => prev + 1)}
                            >
                                Refresh
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleCreateProduct}
                            >
                                Add Product
                            </Button>
                        </Space>
                    </div>

                    {/* Stats Cards */}
                    <Space wrap size="middle">
                        <Card size="small" style={{ minWidth: 200 }}>
                            <Space direction="vertical" size={0}>
                                <Typography.Text type="secondary">Total Products</Typography.Text>
                                <Typography.Title level={4} style={{ margin: 0 }}>0</Typography.Title>
                            </Space>
                        </Card>
                        <Card size="small" style={{ minWidth: 200 }}>
                            <Space direction="vertical" size={0}>
                                <Typography.Text type="secondary">Active</Typography.Text>
                                <Tag color="green">0</Tag>
                            </Space>
                        </Card>
                        <Card size="small" style={{ minWidth: 200 }}>
                            <Space direction="vertical" size={0}>
                                <Typography.Text type="secondary">Draft</Typography.Text>
                                <Tag color="default">0</Tag>
                            </Space>
                        </Card>
                        <Card size="small" style={{ minWidth: 200 }}>
                            <Space direction="vertical" size={0}>
                                <Typography.Text type="secondary">Inactive</Typography.Text>
                                <Tag color="red">0</Tag>
                            </Space>
                        </Card>
                    </Space>
                </Space>
            </div>

            {/* Products List */}
            <Card>
                <ProductsList
                    key={refreshKey}
                    onEdit={handleEditProduct}
                    onView={handleViewProduct}
                    onDelete={handleDeleteSuccess}
                />
            </Card>

            {/* Product Form Modal */}
            <ProductFormModal
                open={isFormModalOpen}
                product={selectedProduct}
                onCancel={() => {
                    setIsFormModalOpen(false);
                    setSelectedProduct(null);
                }}
                onSuccess={handleFormSuccess}
            />

            {/* Product Detail Modal */}
            <ProductDetailModal
                open={isDetailModalOpen}
                product={selectedProduct}
                onCancel={() => {
                    setIsDetailModalOpen(false);
                    setSelectedProduct(null);
                }}
                onEdit={() => {
                    setIsDetailModalOpen(false);
                    setIsFormModalOpen(true);
                }}
            />
        </div>
    );
};

export default ProductsPage;