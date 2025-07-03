import { NextRequest, NextResponse } from 'next/server';
import { SurveyService } from '@/lib/surveyService';

export async function GET(request: NextRequest) {
  try {
    const surveys = await SurveyService.getAllSurveys();
    
    return NextResponse.json({
      success: true,
      surveys,
      message: 'Surveys loaded successfully'
    });
  } catch (error) {
    console.error('Error loading surveys:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to load surveys'
    }, { status: 500 });
  }
}
