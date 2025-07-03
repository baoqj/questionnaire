import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';
import fs from 'fs';
import path from 'path';

// 用户数据文件路径
const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'users.json');

// 确保用户数据文件存在
function ensureUsersFile() {
  const dataDir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(USERS_FILE)) {
    // 创建默认用户数据
    const defaultUsers = [
      {
        id: 'admin_001',
        name: '管理员',
        phone: '13800000000',
        email: 'admin@example.com',
        password: '13800000000',
        role: 'admin',
        createdAt: new Date('2024-01-01').toISOString(),
        lastLoginAt: new Date().toISOString()
      },
      {
        id: 'user_001',
        name: '测试用户',
        phone: '13800000001',
        email: 'user@example.com',
        password: '13800000001',
        role: 'user',
        createdAt: new Date('2024-01-01').toISOString(),
        lastLoginAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
  }
}

// 读取用户数据
function getUsers(): User[] {
  ensureUsersFile();
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

// 保存用户数据
function saveUsers(users: User[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users file:', error);
  }
}

// 验证手机号格式
function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

// 验证姓名格式
function validateName(name: string): boolean {
  return name.length >= 2 && name.length <= 20;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, password } = body;

    // 验证必填字段
    if (!name || !phone || !password) {
      return NextResponse.json({
        success: false,
        error: '请填写所有必填字段'
      }, { status: 400 });
    }

    // 验证手机号格式
    if (!validatePhone(phone)) {
      return NextResponse.json({
        success: false,
        error: '请输入正确的手机号'
      }, { status: 400 });
    }

    // 验证姓名格式
    if (!validateName(name)) {
      return NextResponse.json({
        success: false,
        error: '姓名长度应在2-20个字符之间'
      }, { status: 400 });
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: '密码长度至少6个字符'
      }, { status: 400 });
    }

    // 获取现有用户数据
    const users = getUsers();

    // 检查用户是否已存在
    const existingUser = users.find(u => u.phone === phone);
    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: '用户已存在'
      }, { status: 409 });
    }

    // 创建新用户
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      password: password, // 在实际应用中应该加密存储
      role: 'user',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    // 添加到用户列表并保存
    users.push(newUser);
    saveUsers(users);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        createdAt: new Date(userWithoutPassword.createdAt),
        lastLoginAt: newUser.lastLoginAt || new Date()
      },
      message: '注册成功'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: '注册失败，请稍后重试'
    }, { status: 500 });
  }
}
