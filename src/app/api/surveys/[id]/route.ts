import { NextRequest, NextResponse } from 'next/server';
import { SurveyService } from '@/lib/surveyService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 模拟数据库查询延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    const survey = await SurveyService.getSurveyById(id);

    if (survey) {
      return NextResponse.json({
        success: true,
        data: survey,
        message: 'Survey retrieved successfully'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Survey not found'
    }, { status: 404 });

  } catch (error) {
    console.error('Error fetching survey:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
