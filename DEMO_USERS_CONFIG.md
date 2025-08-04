# 演示用户配置说明

## 概述

演示用户配置文件位于 `server/demo-users.ts`，用于管理所有演示账户的登录信息。

## 配置文件结构

### DemoUser 接口
```typescript
interface DemoUser {
  id: string;              // 用户唯一标识
  email: string;           // 邮箱地址
  phone: string;           // 手机号码
  password: string;        // 登录密码
  firstName: string;       // 名
  lastName: string;        // 姓
  profileImageUrl: string | null;  // 头像URL
  role: 'client' | 'therapist' | 'admin';  // 用户角色
}
```

## 当前演示用户

### 1. 客户端用户 - 张三
- **ID**: demo_client_001
- **邮箱**: client@demo.com
- **手机**: 13800138001
- **密码**: demo123
- **角色**: client

### 2. 咨询师用户 - 李医生
- **ID**: demo_therapist_001
- **邮箱**: therapist@demo.com
- **手机**: 13800138002
- **密码**: demo123
- **角色**: therapist

### 3. 客户端用户 - Andrew Xu
- **ID**: 44517059
- **邮箱**: andrewxu1992@gmail.com
- **手机**: 13800138003
- **密码**: demo@123
- **角色**: client

## 登录方式

用户可以通过以下方式登录：
1. **邮箱 + 密码**
2. **手机号 + 密码**
3. **邮箱/手机号 + 验证码**（默认验证码：123456）

## 如何添加新用户

1. 在 `server/demo-users.ts` 的 `demoUsers` 数组中添加新用户对象
2. 确保用户ID、邮箱、手机号唯一
3. 重启服务器使配置生效

## 如何修改用户信息

1. 编辑 `server/demo-users.ts` 文件
2. 修改对应用户的信息
3. 重启服务器使配置生效

## 安全注意事项

- 演示环境使用明文密码，生产环境需要加密存储
- 验证码在演示环境固定为 "123456"
- 定期更新演示用户密码以确保安全

## 相关文件

- `server/demo-users.ts` - 演示用户配置
- `server/routes.ts` - 登录逻辑实现
- `DEMO_USERS_CONFIG.md` - 本配置说明文档