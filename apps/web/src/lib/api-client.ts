import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// API Response Types
export interface ApiResponse<T> {
    success: boolean
    data: T
    message?: string
    meta?: {
        timestamp: string
        request_id?: string
    }
}

export interface ApiError {
    success: false
    error: {
        code: string
        message: string
        details?: Array<{
            field: string
            message: string
        }>
    }
    meta?: {
        timestamp: string
        request_id?: string
    }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8007/api/v1',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token')
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

// Response interceptor to handle errors
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response
    },
    (error: AxiosError<ApiError>) => {
        if (error.response) {
            // Server responded with error status
            const apiError = error.response.data
            if (error.response.status === 401) {
                // Unauthorized - clear token and redirect to login
                localStorage.removeItem('auth_token')
                window.location.href = '/login'
            }
            return Promise.reject(apiError)
        } else if (error.request) {
            // Request made but no response
            return Promise.reject({
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Network error. Please check your connection.',
                },
            })
        } else {
            // Something else happened
            return Promise.reject({
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: error.message || 'An unexpected error occurred.',
                },
            })
        }
    }
)

export default apiClient