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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body;

    // 验证输入
    if (!phone || !password) {
      return NextResponse.json({
        success: false,
        error: '请输入手机号和密码'
      }, { status: 400 });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({
        success: false,
        error: '请输入正确的手机号'
      }, { status: 400 });
    }

    // 获取用户数据
    const users = getUsers();
    
    // 查找用户
    const user = users.find(u => u.phone === phone);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 401 });
    }

    // 验证密码
    if (user.password !== password) {
      return NextResponse.json({
        success: false,
        error: '密码错误'
      }, { status: 401 });
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    saveUsers(users);

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        createdAt: new Date(userWithoutPassword.createdAt),
        lastLoginAt: user.lastLoginAt || new Date()
      },
      message: '登录成功'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: '登录失败，请稍后重试'
    }, { status: 500 });
  }
}
