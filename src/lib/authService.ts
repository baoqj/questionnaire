import { User, LoginCredentials, AuthState } from '@/types';

// 认证服务 - 使用API进行用户管理

// 认证服务类
export class AuthService {
  private static readonly STORAGE_KEY = 'auth_user';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时

  // 登录
  static async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 调用登录API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '登录失败' };
      }

      if (data.success && data.user) {
        // 保存到本地存储
        this.saveUserToStorage(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || '登录失败' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    }
  }

  // 注册
  static async register(userData: { name: string; phone: string; email?: string; password: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 调用注册API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '注册失败' };
      }

      if (data.success && data.user) {
        // 保存到本地存储
        this.saveUserToStorage(data.user);
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || '注册失败' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    }
  }

  // 登出
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // 获取当前用户
  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const userData = JSON.parse(stored);
      
      // 检查会话是否过期
      const loginTime = new Date(userData.lastLoginAt).getTime();
      const now = Date.now();
      
      if (now - loginTime > this.SESSION_TIMEOUT) {
        this.logout();
        return null;
      }

      return {
        ...userData,
        createdAt: new Date(userData.createdAt),
        lastLoginAt: new Date(userData.lastLoginAt)
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // 检查是否已认证
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // 检查是否为管理员
  static isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  // 更新用户信息
  static async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 调用更新用户API
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '更新失败' };
      }

      if (data.success && data.user) {
        // 如果是当前用户，更新本地存储
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          this.saveUserToStorage(data.user);
        }
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.error || '更新失败' };
      }
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: '网络错误，请稍后重试' };
    }
  }

  // 获取所有用户（管理员功能）
  static async getAllUsers(): Promise<User[]> {
    try {
      // 只有管理员可以访问
      if (!this.isAdmin()) {
        throw new Error('权限不足');
      }

      const response = await fetch('/api/auth/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取用户列表失败');
      }

      return data.users || [];
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  // 保存用户到本地存储
  private static saveUserToStorage(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    }
  }

  // 验证手机号格式
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  // 验证姓名格式
  static validateName(name: string): boolean {
    return name.length >= 2 && name.length <= 20;
  }
}

// React Hook for authentication
export const useAuth = () => {
  const getCurrentUser = () => AuthService.getCurrentUser();
  const isAuthenticated = () => AuthService.isAuthenticated();
  const isAdmin = () => AuthService.isAdmin();

  return {
    login: (credentials: LoginCredentials) => AuthService.login(credentials),
    register: (userData: { name: string; phone: string; email?: string; password: string }) => AuthService.register(userData),
    logout: () => AuthService.logout(),
    getCurrentUser,
    isAuthenticated,
    isAdmin,
    updateUser: (userId: string, userData: Partial<User>) => AuthService.updateUser(userId, userData),
    getAllUsers: () => AuthService.getAllUsers(),
    validatePhone: (phone: string) => AuthService.validatePhone(phone),
    validateName: (name: string) => AuthService.validateName(name)
  };
};
