/**
 * Products List Component
 * Displays products in a table with filtering, sorting, and pagination
 */

import { useState } from 'react';
import { Table, Tag, Button, Space, Image, Popconfirm, message } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import { useGetProductsQuery, useDeleteProductMutation } from '../../../store/api/apiSlice';
import type { Product } from '../../../types';
import type { TableParams } from '../../../types';

interface ProductsListProps {
    onEdit: (product: Product) => void;
    onView: (product: Product) => void;
    onDelete: () => void;
}

const ProductsList: React.FC<ProductsListProps> = ({ onEdit, onView, onDelete }) => {
    const [tableParams, setTableParams] = useState<TableParams>({
        pagination: {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 1,
        },
        filters: {},
    });

    const { data, isLoading, error } = useGetProductsQuery(tableParams);
    const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

    const handleDelete = async (id: string) => {
        try {
            await deleteProduct(id).unwrap();
            onDelete();
        } catch (error) {
            message.error('Failed to delete product');
        }
    };

    const handleTableChange = (
        pagination: TablePaginationConfig,
        filters: Record<string, FilterValue | null>,
        sorter: SorterResult<Product> | SorterResult<Product>[]
    ) => {
        setTableParams({
            pagination: {
                page: pagination.current || 1,
                pageSize: pagination.pageSize || 10,
                total: data?.total || 0,
                totalPages: Math.ceil((data?.total || 0) / (pagination.pageSize || 10)),
            },
            filters: filters as Record<string, any>,
            sorting: Array.isArray(sorter)
                ? { field: sorter[0].field as string, direction: sorter[0].order === 'ascend' ? 'asc' : 'desc' }
                : sorter.field
                    ? { field: sorter.field as string, direction: sorter.order === 'ascend' ? 'asc' : 'desc' }
                    : undefined,
        });
    };

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

    const columns: ColumnsType<Product> = [
        {
            title: 'Product',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (name: string, record: Product) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 500 }}>{name}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>{record.sku}</span>
                </Space>
            ),
        },
        {
            title: 'Category ID',
            dataIndex: 'categoryId',
            key: 'categoryId',
            render: (categoryId: string) => (
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {categoryId || 'N/A'}
                </span>
            ),
        },
        {
            title: 'Price (paisa)',
            dataIndex: 'price',
            key: 'price',
            sorter: true,
            render: (price: number) => (
                <span>{price.toLocaleString()}</span>
            ),
        },
        {
            title: 'Stock',
            dataIndex: 'stock',
            key: 'stock',
            sorter: true,
            render: (stock: number) => (
                <Tag color={stock > 10 ? 'green' : stock > 0 ? 'orange' : 'red'}>
                    {stock} units
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: 'Pending', value: 'PENDING' },
                { text: 'Active', value: 'ACTIVE' },
                { text: 'Inactive', value: 'INACTIVE' },
                { text: 'Rejected', value: 'REJECTED' },
            ],
            render: getStatusTag,
        },
        {
            title: 'Image',
            dataIndex: 'images',
            key: 'images',
            render: (images: string[]) => (
                images?.length > 0 ? (
                    <Image
                        src={images[0]}
                        alt="Product"
                        width={48}
                        height={48}
                        style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                ) : (
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            backgroundColor: '#f0f0f0',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            color: '#8c8c8c',
                        }}
                    >
                        No Image
                    </div>
                )
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record: Product) => (
                <Space size="small">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => onView(record)}
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(record)}
                    />
                    <Popconfirm
                        title="Delete Product"
                        description="Are you sure you want to delete this product?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            loading={isDeleting}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={data?.data || []}
            rowKey="id"
            pagination={{
                current: tableParams.pagination.page,
                pageSize: tableParams.pagination.pageSize,
                total: data?.total || 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} products`,
            }}
            loading={isLoading}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
        />
    );
};

export default ProductsList;