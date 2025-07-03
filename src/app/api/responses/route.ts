import { NextRequest, NextResponse } from 'next/server';
import { Response } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, surveyId, answers } = body;

    // 验证输入
    if (!userId || !surveyId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 });
    }

    // 验证答案数据
    if (answers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No answers provided'
      }, { status: 400 });
    }

    // 模拟数据库保存延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    // 创建回答记录
    const response: Response = {
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      surveyId,
      answers,
      createdAt: new Date(),
      completed: true
    };

    // 在实际应用中，这里应该保存到数据库
    // await saveResponseToDatabase(response);

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Response submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const surveyId = searchParams.get('surveyId');

    if (!userId && !surveyId) {
      return NextResponse.json({
        success: false,
        error: 'Either userId or surveyId is required'
      }, { status: 400 });
    }

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 在实际应用中，这里应该从数据库查询
    // const responses = await getResponsesFromDatabase({ userId, surveyId });

    // 模拟返回空数组
    const responses: Response[] = [];

    return NextResponse.json({
      success: true,
      data: responses,
      message: 'Responses retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
