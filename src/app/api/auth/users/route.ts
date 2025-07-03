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
