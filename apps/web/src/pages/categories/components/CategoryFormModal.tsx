/**
 * Category Form Modal
 * Handles create and edit category operations
 */

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../../../store/api/categoryApiSlice';
import { Category } from '../../../types';

interface CategoryFormModalProps {
    category?: Category | null;
    categories: Category[];
    onClose: () => void;
    isOpen: boolean;
}

export function CategoryFormModal({ category, categories, onClose, isOpen }: CategoryFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentId: '',
        status: 'active' as 'active' | 'inactive' | 'archived',
        sortOrder: 0,
        featured: false,
        showInMenu: true,
        metaKeywords: [] as string[],
    });

    const [metaKeywordInput, setMetaKeywordInput] = useState('');

    const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
    const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();

    const isEditing = !!category;
    const isLoading = isCreating || isUpdating;

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description,
                parentId: category.parentId || '',
                status: category.status,
                sortOrder: category.sortOrder,
                featured: category.featured,
                showInMenu: category.showInMenu,
                metaKeywords: category.metaKeywords || [],
            });
        } else {
            setFormData({
                name: '',
                description: '',
                parentId: '',
                status: 'active',
                sortOrder: 0,
                featured: false,
                showInMenu: true,
                metaKeywords: [],
            });
        }
    }, [category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isEditing && category) {
                await updateCategory({
                    id: category._id,
                    data: formData,
                }).unwrap();
            } else {
                await createCategory(formData).unwrap();
            }
            onClose();
        } catch (error) {
            console.error('Failed to save category:', error);
        }
    };

    const handleAddMetaKeyword = () => {
        if (metaKeywordInput.trim() && !formData.metaKeywords.includes(metaKeywordInput.trim())) {
            setFormData({
                ...formData,
                metaKeywords: [...formData.metaKeywords, metaKeywordInput.trim()],
            });
            setMetaKeywordInput('');
        }
    };

    const handleRemoveMetaKeyword = (keyword: string) => {
        setFormData({
            ...formData,
            metaKeywords: formData.metaKeywords.filter(k => k !== keyword),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {isEditing ? 'Edit Category' : 'Create Category'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter category name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter category description"
                                />
                            </div>
                        </div>

                        {/* Parent Category */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">Hierarchy</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Parent Category
                                </label>
                                <select
                                    value={formData.parentId}
                                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">None (Root Category)</option>
                                    {categories
                                        .filter(cat => cat._id !== category?._id)
                                        .map(cat => (
                                            <option key={cat._id} value={cat._id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty to create a root category
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sort Order
                                </label>
                                <input
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Settings */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">Settings</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'archived' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-6">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.featured}
                                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Featured</span>
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.showInMenu}
                                        onChange={(e) => setFormData({ ...formData, showInMenu: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">Show in Menu</span>
                                </label>
                            </div>
                        </div>

                        {/* SEO */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">SEO</h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Meta Keywords
                                </label>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={metaKeywordInput}
                                        onChange={(e) => setMetaKeywordInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMetaKeyword())}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Add keyword"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddMetaKeyword}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {formData.metaKeywords.map(keyword => (
                                        <span
                                            key={keyword}
                                            className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                        >
                                            {keyword}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMetaKeyword(keyword)}
                                                className="ml-2 text-blue-600 hover:text-blue-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving...' : isEditing ? 'Update Category' : 'Create Category'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CategoryFormModal;