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

// 保存用户数据
function saveUsers(users: User[]) {
  try {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users file:', error);
  }
}

// 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 获取现有用户数据
    const users = getUsers();
    
    // 查找用户
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 });
    }

    // 验证更新数据
    if (body.phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(body.phone)) {
        return NextResponse.json({
          success: false,
          error: '请输入正确的手机号'
        }, { status: 400 });
      }

      // 检查手机号是否已被其他用户使用
      const existingUser = users.find(u => u.phone === body.phone && u.id !== id);
      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: '手机号已被使用'
        }, { status: 409 });
      }
    }

    if (body.name) {
      if (body.name.trim().length < 2 || body.name.trim().length > 20) {
        return NextResponse.json({
          success: false,
          error: '姓名长度应在2-20个字符之间'
        }, { status: 400 });
      }
    }

    // 更新用户信息
    const updatedUser = {
      ...users[userIndex],
      ...body,
      id, // 确保ID不被修改
      updatedAt: new Date().toISOString()
    };

    users[userIndex] = updatedUser;
    saveUsers(users);

    // 返回更新后的用户信息（不包含密码）
    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        createdAt: new Date(userWithoutPassword.createdAt),
        lastLoginAt: updatedUser.lastLoginAt ? new Date(updatedUser.lastLoginAt) : undefined,
        updatedAt: new Date(updatedUser.updatedAt)
      },
      message: '用户信息更新成功'
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({
      success: false,
      error: '更新失败，请稍后重试'
    }, { status: 500 });
  }
}
