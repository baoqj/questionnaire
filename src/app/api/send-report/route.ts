import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, reportData } = await request.json();

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请提供有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 这里应该集成真实的邮件服务，比如 SendGrid, Nodemailer 等
    // 目前我们模拟发送过程
    console.log('发送报告到邮箱:', email);
    console.log('报告数据:', reportData);

    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 在实际应用中，这里会调用邮件服务API
    // 例如：
    // const result = await sendEmailWithSendGrid({
    //   to: email,
    //   subject: 'CRS合规风险分析报告',
    //   html: generateReportHTML(reportData)
    // });

    return NextResponse.json({
      success: true,
      message: '报告已成功发送到您的邮箱'
    });

  } catch (error) {
    console.error('发送邮件失败:', error);
    return NextResponse.json(
      { error: '发送失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 生成报告HTML的辅助函数（示例）
function generateReportHTML(reportData: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>CRS合规风险分析报告</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #7C3AED, #A855F7); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .risk-item { margin-bottom: 20px; padding: 15px; border-left: 4px solid #7C3AED; background: #f8f9fa; }
        .risk-title { font-weight: bold; margin-bottom: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CRS合规风险分析报告</h1>
        <p>专业的合规风险评估与建议</p>
      </div>
      <div class="content">
        <h2>风险分析结果</h2>
        ${reportData?.suggestions?.map((item: any, index: number) => `
          <div class="risk-item">
            <div class="risk-title">${index + 1}. ${item.title}</div>
            <p>${item.content}</p>
          </div>
        `).join('') || ''}
      </div>
      <div class="footer">
        <p>本报告由 Knowcore AI 生成</p>
        <p>如有疑问，请联系我们的专业团队</p>
      </div>
    </body>
    </html>
  `;
}
