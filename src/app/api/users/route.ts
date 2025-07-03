import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/types';

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

    // 模拟数据库保存延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 创建用户对象
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      phone: phone.trim(),
      createdAt: new Date()
    };

    // 在实际应用中，这里应该保存到数据库
    // await saveUserToDatabase(user);

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
