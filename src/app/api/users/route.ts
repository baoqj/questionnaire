import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';
import fs from 'fs';
import path from 'path';

// 用户数据文件路径
const USERS_FILE = path.join(process.cwd(), 'src', 'data', 'users.json');

// 读取用户数据
function getUsers(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users file:', error);
    return [];
  }
}

// 获取所有用户（管理员功能）
export async function GET(request: NextRequest) {
  try {
    const users = getUsers();

    // 移除密码字段
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        createdAt: new Date(userWithoutPassword.createdAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : undefined
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithoutPasswords
    });

  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// 创建匿名用户（用于问卷填写）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    // 验证输入
    if (!name || !phone) {
      return NextResponse.json({
        success: false,
        error: 'Name and phone are required'
      }, { status: 400 });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 });
    }

    // 验证姓名长度
    if (name.trim().length < 2 || name.trim().length > 20) {
      return NextResponse.json({
        success: false,
        error: 'Name must be between 2 and 20 characters'
      }, { status: 400 });
    }

    // 创建匿名用户对象
    const user: User = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      name: name.trim(),
      phone: phone.trim(),
      role: 'user',
      createdAt: new Date()
    };

    return NextResponse.json({
      success: true,
      data: user,
      message: 'Guest user created successfully'
    });

  } catch (error) {
    console.error('Error creating guest user:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
