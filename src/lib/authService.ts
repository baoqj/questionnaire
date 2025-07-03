import { User, LoginCredentials, AuthState } from '@/types';

// 模拟用户数据库
const MOCK_USERS: User[] = [
  {
    id: 'admin_001',
    name: '管理员',
    phone: '13800000000',
    email: 'admin@example.com',
    password: '13800000000',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date()
  },
  {
    id: 'user_001',
    name: '测试用户',
    phone: '13800000001',
    email: 'user@example.com',
    password: '13800000001',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date()
  }
];

// 认证服务类
export class AuthService {
  private static readonly STORAGE_KEY = 'auth_user';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时

  // 登录
  static async login(credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证必填字段
      if (!credentials.phone || !credentials.password) {
        return { success: false, error: '请输入手机号和密码' };
      }

      // 查找用户
      const user = MOCK_USERS.find(u => u.phone === credentials.phone);

      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      // 验证密码（在实际应用中应该使用加密比较）
      if (user.password !== credentials.password) {
        return { success: false, error: '密码错误' };
      }

      // 更新最后登录时间
      user.lastLoginAt = new Date();

      // 保存到本地存储
      this.saveUserToStorage(user);

      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '登录失败，请稍后重试' };
    }
  }

  // 注册
  static async register(userData: { name: string; phone: string; email?: string; password: string }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 检查用户是否已存在
      const existingUser = MOCK_USERS.find(u => u.phone === userData.phone);
      if (existingUser) {
        return { success: false, error: '用户已存在' };
      }

      // 验证必填字段
      if (!userData.name || !userData.phone || !userData.password) {
        return { success: false, error: '请填写所有必填字段' };
      }

      // 验证手机号格式
      if (!this.validatePhone(userData.phone)) {
        return { success: false, error: '请输入正确的手机号' };
      }

      // 验证用户名长度
      if (!this.validateName(userData.name)) {
        return { success: false, error: '姓名长度应在2-20个字符之间' };
      }

      // 创建新用户
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: userData.name,
        phone: userData.phone,
        email: userData.email || '',
        password: userData.password, // 在实际应用中应该加密存储
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      MOCK_USERS.push(newUser);
      this.saveUserToStorage(newUser);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: '注册失败，请稍后重试' };
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
      const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return { success: false, error: '用户不存在' };
      }

      // 更新用户信息
      MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...updates };
      const updatedUser = MOCK_USERS[userIndex];

      // 如果是当前用户，更新本地存储
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        this.saveUserToStorage(updatedUser);
      }

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: '更新失败' };
    }
  }

  // 获取所有用户（管理员功能）
  static async getAllUsers(): Promise<User[]> {
    // 只有管理员可以访问
    if (!this.isAdmin()) {
      throw new Error('权限不足');
    }
    return MOCK_USERS;
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
    login: AuthService.login,
    register: AuthService.register,
    logout: AuthService.logout,
    getCurrentUser,
    isAuthenticated,
    isAdmin,
    updateUser: AuthService.updateUser,
    getAllUsers: AuthService.getAllUsers,
    validatePhone: AuthService.validatePhone,
    validateName: AuthService.validateName
  };
};
