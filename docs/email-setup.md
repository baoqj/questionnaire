# 邮件发送功能配置指南

## 📧 邮件服务配置

系统支持三种邮件发送方式，请根据需要选择配置：

### 1. SMTP配置 (推荐)

#### QQ邮箱配置
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-auth-code
```

**获取QQ邮箱授权码步骤：**
1. 登录QQ邮箱 → 设置 → 账户
2. 开启"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
3. 生成授权码，将授权码填入`SMTP_PASS`

#### 163邮箱配置
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.163.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@163.com
SMTP_PASS=your-auth-code
```

#### Gmail配置
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. SendGrid配置

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Resend配置

```env
EMAIL_SERVICE=resend
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## 🔧 配置步骤

1. 复制 `.env.example` 为 `.env.local`
2. 根据选择的邮件服务填写相应配置
3. 重启开发服务器

## 🧪 测试邮件发送

配置完成后，可以通过以下方式测试：

1. 完成一个问卷调查
2. 在结果页面点击"发送报告"
3. 输入邮箱地址进行测试

## ⚠️ 注意事项

1. **安全性**: 不要将真实的API密钥提交到代码仓库
2. **限制**: 免费邮件服务通常有发送限制
3. **域名**: 生产环境建议使用自己的域名邮箱
4. **备用方案**: 如果邮件服务未配置，系统会模拟发送成功

## 🚀 Vercel部署配置

在Vercel部署时，需要在环境变量中配置：

```
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=your-auth-code
```

## 📝 故障排除

### 常见问题

1. **535 Authentication failed**: 检查邮箱授权码是否正确
2. **Connection timeout**: 检查SMTP服务器地址和端口
3. **SSL/TLS错误**: 确认SMTP_SECURE设置是否正确

### 调试方法

查看控制台日志，邮件发送过程会输出详细信息：
- ✅ 发送成功
- ❌ 发送失败及错误原因
