# Airwallex 支付配置

本项目使用 Airwallex 作为支付服务提供商。您可以通过环境变量配置 Airwallex 的连接参数。

## 环境变量配置

创建 `.env` 文件或在 Replit 的 Secrets 中添加以下变量：

```bash
# Airwallex 客户端 ID
AIRWALLEX_CLIENT_ID=your_client_id_here

# Airwallex API 密钥
AIRWALLEX_API_KEY=your_api_key_here

# Airwallex 环境 (demo, staging, prod)
AIRWALLEX_ENV=demo

# Airwallex API 地址
AIRWALLEX_API_URL=https://api-demo.airwallex.com
```

## 默认配置

如果未设置环境变量，系统将使用以下默认配置：

- **Client ID**: `FgTDjfg9SEGV4vsliPYZzQ`
- **API Key**: `3e865751b89d8fd0da82e564f7397da915e6c1beb0a54256d2ed55475220318eda7cc1c2290eb49a86ab74bb623c2406`
- **Environment**: `demo`
- **API URL**: `https://api-demo.airwallex.com`

## 环境说明

### Demo 环境
- 用于开发和测试
- 不会产生实际费用
- 支持模拟支付流程

### Staging 环境
- 用于预生产测试
- 使用真实的 API 但不产生实际费用

### Production 环境
- 生产环境
- 会产生实际的支付交易

## 获取 Airwallex 凭据

1. 访问 [Airwallex 开发者控制台](https://www.airwallex.com/app/login)
2. 创建应用程序
3. 获取 Client ID 和 API Key
4. 配置 Webhook 地址（如需要）

## 安全注意事项

- 永远不要在代码中硬编码 API 密钥
- 在生产环境中确保使用 HTTPS
- 定期轮换 API 密钥
- 限制 API 密钥的权限范围