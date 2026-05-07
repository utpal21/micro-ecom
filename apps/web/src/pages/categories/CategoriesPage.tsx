/**
 * Categories Management Page
 * Production-grade category management with CRUD operations
 */

import { useState, useEffect } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    FolderIcon
} from '@heroicons/react/24/outline';
import { useGetCategoriesQuery } from '../../store/api/categoryApiSlice';
import { CategoryFormModal } from './components/CategoryFormModal';
import { CategoryDetailModal } from './components/CategoryDetailModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useDeleteCategoryMutation } from '../../store/api/categoryApiSlice';
import { Category } from '../../types';

export function CategoriesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    // Fetch categories
    const { data: categories = [], isLoading, error, refetch } = useGetCategoriesQuery();

    // Delete category mutation
    const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

    // Filter categories based on search term
    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Separate root categories and subcategories
    const rootCategories = filteredCategories.filter(cat => !cat.parentId);
    const subCategories = filteredCategories.filter(cat => cat.parentId);

    // Helper function to get subcategories for a parent
    const getSubCategories = (parentId: string): Category[] => {
        return subCategories.filter(cat => cat.parentId === parentId);
    };

    // Handlers
    const handleCreate = () => {
        setSelectedCategory(null);
        setIsFormModalOpen(true);
    };

    const handleEdit = (category: Category) => {
        setSelectedCategory(category);
        setIsFormModalOpen(true);
    };

    const handleView = (category: Category) => {
        setSelectedCategory(category);
        setIsDetailModalOpen(true);
    };

    const handleDelete = (category: Category) => {
        setCategoryToDelete(category);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (categoryToDelete) {
            try {
                await deleteCategory(categoryToDelete._id).unwrap();
                setDeleteDialogOpen(false);
                setCategoryToDelete(null);
            } catch (error) {
                console.error('Failed to delete category:', error);
            }
        }
    };

    const handleFormClose = () => {
        setIsFormModalOpen(false);
        setSelectedCategory(null);
        refetch();
    };

    // Recursive function to render category tree
    const renderCategoryTree = (category: Category, level: number = 0) => {
        const subCats = getSubCategories(category._id);
        const hasChildren = subCats.length > 0;

        return (
            <div key={category._id} className={`${level > 0 ? 'ml-6' : ''}`}>
                <div
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center space-x-3">
                        {level > 0 && <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FolderIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500 max-w-md truncate">
                                {category.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${category.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : category.status === 'inactive'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {category.status}
                                </span>
                                {hasChildren && (
                                    <span className="text-xs text-gray-500">
                                        {subCats.length} subcategor{subCats.length === 1 ? 'y' : 'ies'}
                                    </span>
                                )}
                                {category.featured && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        Featured
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleView(category)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                        >
                            <MagnifyingGlassIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleEdit(category)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit category"
                        >
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleDelete(category)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete category"
                        >
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Render subcategories recursively */}
                {hasChildren && (
                    <div className="mt-2 space-y-2">
                        {subCats.map(subCat => renderCategoryTree(subCat, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage product categories and subcategories
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create Category
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-lg shadow">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-12 text-red-600">
                        Failed to load categories
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <FolderIcon className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No categories found</p>
                        <p className="text-sm">
                            {searchTerm ? 'Try a different search term' : 'Create your first category'}
                        </p>
                    </div>
                ) : (
                    <div className="p-6 space-y-3">
                        {rootCategories.map(category => renderCategoryTree(category))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {isFormModalOpen && (
                <CategoryFormModal
                    category={selectedCategory}
                    categories={categories}
                    onClose={handleFormClose}
                    isOpen={isFormModalOpen}
                />
            )}

            {isDetailModalOpen && selectedCategory && (
                <CategoryDetailModal
                    category={selectedCategory}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedCategory(null);
                    }}
                    isOpen={isDetailModalOpen}
                />
            )}

            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setCategoryToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Category"
                message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeleting}
            />
        </div>
    );
}

export default CategoriesPage;