/**
 * Category Detail Modal
 * Displays category information
 */

import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Category } from '../../../types';

interface CategoryDetailModalProps {
    category: Category;
    onClose: () => void;
    isOpen: boolean;
}

export function CategoryDetailModal({ category, onClose, isOpen }: CategoryDetailModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Category Details</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Category Name</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{category.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                                    <dd className="mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${category.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : category.status === 'inactive'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {category.status}
                                        </span>
                                    </dd>
                                </div>
                                <div className="sm:col-span-2">
                                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{category.description}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Hierarchy */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Hierarchy</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Parent Category</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {category.parentId ? 'Yes' : 'None (Root Category)'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Sort Order</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{category.sortOrder}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Settings */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Featured</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {category.featured ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">No</span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Show in Menu</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {category.showInMenu ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">No</span>
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* SEO */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Information</h3>
                            <div className="space-y-3">
                                {category.metaKeywords && category.metaKeywords.length > 0 && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Meta Keywords</dt>
                                        <dd className="mt-2 flex flex-wrap gap-2">
                                            {category.metaKeywords.map(keyword => (
                                                <span
                                                    key={keyword}
                                                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                                >
                                                    {keyword}
                                                </span>
                                            ))}
                                        </dd>
                                    </div>
                                )}
                                {category.slug && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Slug</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{category.slug}</dd>
                                    </div>
                                )}
                                {category.metaTitle && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Meta Title</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{category.metaTitle}</dd>
                                    </div>
                                )}
                                {category.metaDescription && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Meta Description</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{category.metaDescription}</dd>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timestamps */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(category.createdAt).toLocaleString()}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(category.updatedAt).toLocaleString()}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CategoryDetailModal;