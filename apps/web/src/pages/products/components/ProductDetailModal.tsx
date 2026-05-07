/**
 * Product Detail Modal Component
 * Displays product details in a read-only format
 */

import { Modal, Descriptions, Tag, Image, Button, Space, Empty } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { Product } from '../../../types';

interface ProductDetailModalProps {
    open: boolean;
    product: Product | null;
    onCancel: () => void;
    onEdit: () => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ open, product, onCancel, onEdit }) => {
    if (!product) {
        return null;
    }

    const getStatusTag = (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
            PENDING: { color: 'default', text: 'Pending' },
            ACTIVE: { color: 'green', text: 'Active' },
            INACTIVE: { color: 'red', text: 'Inactive' },
            REJECTED: { color: 'volcano', text: 'Rejected' },
        };
        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
    };

    return (
        <Modal
            open={open}
            title={product.name}
            onCancel={onCancel}
            footer={[
                <Space key="actions">
                    <Button onClick={onCancel}>Close</Button>
                    <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
                        Edit Product
                    </Button>
                </Space>,
            ]}
            width={800}
        >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Product Image */}
                {product.images && product.images.length > 0 ? (
                    <div style={{ textAlign: 'center' }}>
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            style={{ maxWidth: '100%', maxHeight: 400 }}
                        />
                    </div>
                ) : (
                    <Empty description="No product image" />
                )}

                {/* Product Details */}
                <Descriptions column={2} bordered>
                    <Descriptions.Item label="Product ID" span={2}>
                        {product.id}
                    </Descriptions.Item>
                    <Descriptions.Item label="SKU">{product.sku || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Category ID">{product.categoryId || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Vendor ID" span={2}>{product.vendorId || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Price (paisa)" span={2}>
                        {product.price.toLocaleString()}
                    </Descriptions.Item>
                    <Descriptions.Item label="Stock">
                        <Tag color={product.stock > 10 ? 'green' : product.stock > 0 ? 'orange' : 'red'}>
                            {product.stock} units
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">{getStatusTag(product.status)}</Descriptions.Item>
                    <Descriptions.Item label="Description" span={2}>
                        {product.description}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created At">{new Date(product.createdAt).toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="Updated At">{new Date(product.updatedAt).toLocaleString()}</Descriptions.Item>
                </Descriptions>
            </Space>
        </Modal>
    );
};

export default ProductDetailModal;