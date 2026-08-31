/**
 * 前端错误处理工具
 * 统一的 API 错误处理和 Toast 通知系统
 */

// ============================================================
// 错误类型定义
// ============================================================

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

// ============================================================
// Toast 通知管理器
// ============================================================

type ToastListener = (toast: ToastMessage) => void;

class ToastManager {
  private listeners: Set<ToastListener> = new Set();
  private toastId = 0;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(toast: ToastMessage) {
    this.listeners.forEach((listener) => listener(toast));
  }

  private createToast(
    type: ToastMessage['type'],
    title: string,
    message?: string,
    duration?: number
  ): ToastMessage {
    const toast: ToastMessage = {
      id: `toast-${++this.toastId}`,
      type,
      title,
      message,
      duration: duration ?? (type === 'error' ? 8000 : 4000),
      dismissible: true,
    };
    this.notify(toast);
    return toast;
  }

  success(title: string, message?: string, duration?: number): ToastMessage {
    return this.createToast('success', title, message, duration);
  }

  error(title: string, message?: string, duration?: number): ToastMessage {
    return this.createToast('error', title, message, duration);
  }

  warning(title: string, message?: string, duration?: number): ToastMessage {
    return this.createToast('warning', title, message, duration);
  }

  info(title: string, message?: string, duration?: number): ToastMessage {
    return this.createToast('info', title, message, duration);
  }
}

export const toast = new ToastManager();

// ============================================================
// API 错误处理
// ============================================================

/**
 * 从 API 响应中提取错误信息
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorBody: any;

    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    const apiError: ApiError = {
      code: errorBody?.error?.code || `HTTP_${response.status}`,
      message: errorBody?.error?.message || response.statusText || 'Unknown error',
      details: errorBody?.error?.details,
      statusCode: response.status,
    };

    // 根据状态码显示不同的 toast
    switch (response.status) {
      case 400:
        toast.warning('请求参数错误', apiError.message);
        break;
      case 401:
        toast.error('认证失败', '请重新登录');
        break;
      case 403:
        toast.error('访问被拒绝', '您没有权限执行此操作');
        break;
      case 404:
        toast.warning('资源不存在', apiError.message);
        break;
      case 429:
        toast.warning('请求过于频繁', '请稍后再试');
        break;
      case 500:
      case 502:
      case 503:
        toast.error('服务器错误', '服务暂时不可用，请稍后再试');
        break;
      default:
        toast.error('请求失败', apiError.message);
    }

    throw apiError;
  }

  const data = await response.json();

  // 处理包装格式的响应
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success) {
      const apiError: ApiError = {
        code: data.error?.code || 'UNKNOWN',
        message: data.error?.message || 'Request failed',
        details: data.error?.details,
      };
      toast.error('请求失败', apiError.message);
      throw apiError;
    }
    return data.data as T;
  }

  return data as T;
}

/**
 * 包装 fetch 请求，统一错误处理
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    return handleApiResponse<T>(response);
  } catch (error) {
    // 网络错误
    if (error instanceof TypeError && error.message.includes('fetch')) {
      toast.error('网络错误', '请检查网络连接');
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
      });
    }
    throw error;
  }
}

/**
 * 创建带重试的请求
 */
export async function apiRequestWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest<T>(url, options);
    } catch (error) {
      lastError = error as Error;

      // 不重试客户端错误 (4xx)
      if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // 指数退避
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================
// 错误分类与格式化
// ============================================================

/**
 * 判断是否为 API 错误
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * 格式化错误信息为用户友好的文本
 */
export function formatErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '发生了未知错误';
}

/**
 * 防抖错误报告（避免重复上报）
 */
const reportedErrors = new Set<string>();

export function reportError(error: Error, context?: Record<string, unknown>): void {
  const errorKey = `${error.message}-${error.stack?.split('\n')[1]}`;

  if (reportedErrors.has(errorKey)) {
    return;
  }

  reportedErrors.add(errorKey);

  // 10 分钟后允许再次上报
  setTimeout(() => {
    reportedErrors.delete(errorKey);
  }, 10 * 60 * 1000);

  // 发送到后端
  if (import.meta.env.PROD) {
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  console.error('Reported error:', error, context);
}
