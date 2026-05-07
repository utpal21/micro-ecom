/**
 * Confirm Dialog Component
 * Reusable confirmation dialog for critical actions
 */

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    type = 'danger',
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    const getIconColor = () => {
        switch (type) {
            case 'danger':
                return 'text-red-600 bg-red-100';
            case 'warning':
                return 'text-yellow-600 bg-yellow-100';
            case 'info':
                return 'text-blue-600 bg-blue-100';
            default:
                return 'text-red-600 bg-red-100';
        }
    };

    const getConfirmButtonClass = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700';
            case 'warning':
                return 'bg-yellow-600 hover:bg-yellow-700';
            case 'info':
                return 'bg-blue-600 hover:bg-blue-700';
            default:
                return 'bg-red-600 hover:bg-red-700';
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

                <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                    {/* Icon */}
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
                        <div className={`p-2 rounded-full ${getIconColor()}`}>
                            <ExclamationTriangleIcon className="h-6 w-6" />
                        </div>
                    </div>

                    {/* Title and Message */}
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
                        <p className="text-sm text-gray-500">{message}</p>
                    </div>

                    {/* Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClass()}`}
                        >
                            {isLoading ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConfirmDialog;