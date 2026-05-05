/**
 * Product Form Modal Component
 * Handles create and edit product operations
 */

import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Upload, message, Image } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useCreateProductMutation, useUpdateProductMutation } from '../../../store/api/apiSlice';
import type { Product } from '../../../types';

const { TextArea } = Input;

interface ProductFormModalProps {
    open: boolean;
    product: Product | null;
    onCancel: () => void;
    onSuccess: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, product, onCancel, onSuccess }) => {
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string>('');

    const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

    const isEdit = !!product;

    useEffect(() => {
        if (open) {
            if (product) {
                form.setFieldsValue({
                    name: product.name,
                    sku: product.sku,
                    description: product.description,
                    price: product.price,
                    currency: product.currency,
                    stock: product.stock,
                    category: product.category,
                    status: product.status,
                });
                setPreviewImage(product.images?.[0] || '');
            } else {
                form.resetFields();
                setFileList([]);
                setPreviewImage('');
            }
        }
    }, [open, product, form]);

    const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const handleSubmit = async (values: any) => {
        try {
            const productData = {
                ...values,
                images: previewImage ? [previewImage] : [],
            };

            if (isEdit && product) {
                await updateProduct({ id: product.id, data: productData }).unwrap();
            } else {
                await createProduct(productData).unwrap();
            }

            onSuccess();
        } catch (error) {
            message.error(isEdit ? 'Failed to update product' : 'Failed to create product');
        }
    };

    return (
        <Modal
            open={open}
            title={isEdit ? 'Edit Product' : 'Create New Product'}
            onCancel={onCancel}
            okText={isEdit ? 'Update' : 'Create'}
            onOk={() => form.submit()}
            confirmLoading={isCreating || isUpdating}
            width={720}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    currency: 'USD',
                    status: 'draft',
                }}
            >
                <Form.Item
                    label="Product Name"
                    name="name"
                    rules={[{ required: true, message: 'Please enter product name' }]}
                >
                    <Input placeholder="Enter product name" />
                </Form.Item>

                <Form.Item
                    label="SKU"
                    name="sku"
                    rules={[{ required: true, message: 'Please enter SKU' }]}
                >
                    <Input placeholder="Enter product SKU" />
                </Form.Item>

                <Form.Item
                    label="Category"
                    name="category"
                    rules={[{ required: true, message: 'Please select category' }]}
                >
                    <Select placeholder="Select category">
                        <Select.Option value="Electronics">Electronics</Select.Option>
                        <Select.Option value="Clothing">Clothing</Select.Option>
                        <Select.Option value="Food">Food</Select.Option>
                        <Select.Option value="Home">Home</Select.Option>
                        <Select.Option value="Sports">Sports</Select.Option>
                        <Select.Option value="Books">Books</Select.Option>
                        <Select.Option value="Other">Other</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label="Description"
                    name="description"
                    rules={[{ required: true, message: 'Please enter description' }]}
                >
                    <TextArea rows={4} placeholder="Enter product description" />
                </Form.Item>

                <div style={{ display: 'flex', gap: 16 }}>
                    <Form.Item
                        label="Price"
                        name="price"
                        rules={[{ required: true, message: 'Please enter price' }]}
                        style={{ flex: 1 }}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Currency"
                        name="currency"
                        style={{ flex: 1 }}
                    >
                        <Select>
                            <Select.Option value="USD">USD ($)</Select.Option>
                            <Select.Option value="EUR">EUR (€)</Select.Option>
                            <Select.Option value="GBP">GBP (£)</Select.Option>
                            <Select.Option value="BDT">BDT (৳)</Select.Option>
                        </Select>
                    </Form.Item>
                </div>

                <Form.Item
                    label="Stock"
                    name="stock"
                    rules={[{ required: true, message: 'Please enter stock quantity' }]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        placeholder="Enter stock quantity"
                    />
                </Form.Item>

                <Form.Item
                    label="Status"
                    name="status"
                    rules={[{ required: true, message: 'Please select status' }]}
                >
                    <Select>
                        <Select.Option value="draft">Draft</Select.Option>
                        <Select.Option value="active">Active</Select.Option>
                        <Select.Option value="inactive">Inactive</Select.Option>
                    </Select>
                </Form.Item>

                <Form.Item label="Product Image">
                    {previewImage && (
                        <div style={{ marginBottom: 16 }}>
                            <Image src={previewImage} alt="Product preview" width={200} />
                        </div>
                    )}
                    <Upload
                        listType="picture-card"
                        fileList={fileList}
                        onChange={handleUploadChange}
                        beforeUpload={(file) => {
                            const reader = new FileReader();
                            reader.readAsDataURL(file);
                            reader.onload = () => {
                                setPreviewImage(reader.result as string);
                            };
                            return false; // Prevent auto upload
                        }}
                        maxCount={1}
                    >
                        {fileList.length === 0 && (
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Upload</div>
                            </div>
                        )}
                    </Upload>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ProductFormModal;