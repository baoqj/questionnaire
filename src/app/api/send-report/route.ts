import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_CONFIG } from '@/lib/config';

// 发送邮件的核心函数
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const service = EMAIL_CONFIG.service;

  try {
    if (service === 'smtp') {
      return await sendEmailWithSMTP(to, subject, html);
    } else if (service === 'sendgrid') {
      return await sendEmailWithSendGrid(to, subject, html);
    } else if (service === 'resend') {
      return await sendEmailWithResend(to, subject, html);
    } else {
      console.log('📧 邮件服务未配置，使用模拟发送');
      console.log(`收件人: ${to}`);
      console.log(`主题: ${subject}`);
      return true; // 模拟成功
    }
  } catch (error) {
    console.error('邮件发送失败:', error);
    return false;
  }
}

// SMTP发送 (推荐)
async function sendEmailWithSMTP(to: string, subject: string, html: string): Promise<boolean> {
  try {
    // 动态导入nodemailer (需要安装: npm install nodemailer @types/nodemailer)
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.default.createTransport({
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
      secure: EMAIL_CONFIG.smtp.secure,
      auth: EMAIL_CONFIG.smtp.auth
    });

    const info = await transporter.sendMail({
      from: `"CRS Check 报告系统" <${EMAIL_CONFIG.smtp.auth.user}>`,
      to: to,
      subject: subject,
      html: html
    });

    console.log('✅ SMTP邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ SMTP邮件发送失败:', error);
    return false;
  }
}

// SendGrid发送
async function sendEmailWithSendGrid(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMAIL_CONFIG.sendgrid.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: { email: EMAIL_CONFIG.sendgrid.fromEmail },
        subject: subject,
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    });

    if (response.ok) {
      console.log('✅ SendGrid邮件发送成功');
      return true;
    } else {
      console.error('❌ SendGrid邮件发送失败:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ SendGrid邮件发送失败:', error);
    return false;
  }
}

// Resend发送
async function sendEmailWithResend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMAIL_CONFIG.resend.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_CONFIG.resend.fromEmail,
        to: [to],
        subject: subject,
        html: html
      })
    });

    if (response.ok) {
      console.log('✅ Resend邮件发送成功');
      return true;
    } else {
      console.error('❌ Resend邮件发送失败:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Resend邮件发送失败:', error);
    return false;
  }
}

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

    console.log('📧 开始发送报告到邮箱:', email);

    // 生成邮件内容
    const subject = 'CRS合规风险分析报告';
    const html = generateReportHTML(reportData);

    // 发送邮件
    const success = await sendEmail(email, subject, html);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '报告已成功发送到您的邮箱'
      });
    } else {
      return NextResponse.json(
        { error: '邮件发送失败，请检查邮件服务配置' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('发送邮件失败:', error);
    return NextResponse.json(
      { error: '发送失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 简单的markdown转HTML函数
function markdownToHTML(text: string): string {
  if (!text) return '';

  return text
    // 加粗 **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 斜体 *text* -> <em>text</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 换行 \n -> <br>
    .replace(/\n/g, '<br>')
    // 列表项 - item -> <li>item</li>
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 包装连续的列表项
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // 数字列表 1. item -> <li>item</li>
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 标题 ## title -> <h3>title</h3>
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>');
}

// 生成报告HTML的辅助函数
function generateReportHTML(reportData: any) {
  const currentDate = new Date().toLocaleDateString('zh-CN');

  // 处理风险评分数据
  const riskScores = reportData?.riskAnalysis?.riskScores || reportData?.radarData || {};
  const riskItems = Object.entries(riskScores).map(([key, value]) =>
    `<div class="risk-score-item">
      <span class="risk-name">${key}</span>
      <div class="risk-bar">
        <div class="risk-fill" style="width: ${(value as number) * 20}%"></div>
        <span class="risk-value">${value}/5</span>
      </div>
    </div>`
  ).join('');

  // 处理AI分析建议
  const suggestions = reportData?.suggestions || [];
  const suggestionsHTML = suggestions.map((suggestion: string, index: number) => `
    <div class="suggestion-item">
      <div class="suggestion-number">${index + 1}</div>
      <div class="suggestion-content">${markdownToHTML(suggestion)}</div>
    </div>
  `).join('');

  // 处理AI总结
  const aiSummary = markdownToHTML(reportData?.aiSummary || '暂无AI分析总结');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>CRS合规风险分析报告</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f8f9fa;
        }
        .container { max-width: 800px; margin: 0 auto; background: white; }
        .header {
          background: linear-gradient(135deg, #7C3AED, #A855F7);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header p { margin: 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 {
          color: #7C3AED;
          border-bottom: 2px solid #7C3AED;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .risk-scores { margin-bottom: 30px; }
        .risk-score-item {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .risk-name {
          width: 80px;
          font-weight: 600;
          color: #555;
        }
        .risk-bar {
          flex: 1;
          height: 20px;
          background: #e9ecef;
          border-radius: 10px;
          position: relative;
          margin: 0 15px;
        }
        .risk-fill {
          height: 100%;
          background: linear-gradient(90deg, #7C3AED, #A855F7);
          border-radius: 10px;
          transition: width 0.3s ease;
        }
        .risk-value {
          font-weight: 600;
          color: #7C3AED;
          min-width: 40px;
        }
        .suggestion-item {
          display: flex;
          margin-bottom: 20px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 12px;
          border-left: 4px solid #7C3AED;
        }
        .suggestion-number {
          width: 30px;
          height: 30px;
          background: #7C3AED;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .suggestion-content {
          flex: 1;
          line-height: 1.7;
        }
        .ai-summary {
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 25px;
          border-radius: 12px;
          border-left: 4px solid #28a745;
          margin-bottom: 20px;
        }
        .ai-summary h3 {
          color: #28a745;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .footer {
          text-align: center;
          padding: 30px 20px;
          background: #f8f9fa;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #e9ecef;
        }
        .footer p { margin: 5px 0; }
        .date {
          text-align: right;
          color: #666;
          font-size: 14px;
          margin-bottom: 20px;
        }
        strong { color: #7C3AED; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
        h3 { color: #555; margin: 15px 0 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>CRS合规风险分析报告</h1>
          <p>基于AI智能分析的专业合规风险评估</p>
        </div>

        <div class="content">
          <div class="date">报告生成时间: ${currentDate}</div>

          <div class="section">
            <h2>🎯 AI智能分析总结</h2>
            <div class="ai-summary">
              <h3>综合评估结果</h3>
              <div>${aiSummary}</div>
            </div>
          </div>

          <div class="section">
            <h2>📊 风险评分详情</h2>
            <div class="risk-scores">
              ${riskItems}
            </div>
          </div>

          <div class="section">
            <h2>💡 专业建议</h2>
            <div class="suggestions">
              ${suggestionsHTML}
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>本报告由 Knowcore AI 智能生成</strong></p>
          <p>如需进一步咨询，请联系我们的专业合规团队</p>
          <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
            此报告仅供参考，具体合规要求请咨询专业律师或会计师
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
