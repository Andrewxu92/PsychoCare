// 演示用户配置文件
// 管理所有演示账户的登录信息

export interface DemoUser {
  id: string;
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  role: 'client' | 'therapist' | 'admin';
}

export const demoUsers: DemoUser[] = [
  {
    id: "demo_client_001",
    email: "client@demo.com",
    phone: "13800138001",
    password: "demo123",
    firstName: "张",
    lastName: "三",
    profileImageUrl: null,
    role: "client"
  },
  {
    id: "demo_therapist_001", 
    email: "therapist@demo.com",
    phone: "13800138002",
    password: "demo123",
    firstName: "李",
    lastName: "医生",
    profileImageUrl: null,
    role: "therapist"
  },
  {
    id: "44517059",
    email: "andrewxu1992@gmail.com",
    phone: "13800138003",
    password: "demo@123",
    firstName: "Andrew",
    lastName: "Xu",
    profileImageUrl: null,
    role: "client"
  }
];

// 默认验证码（演示环境）
export const DEFAULT_VERIFICATION_CODE = "123456";

// 根据邮箱或手机号查找用户
export function findDemoUser(emailOrPhone: string): DemoUser | undefined {
  return demoUsers.find(user => 
    user.email === emailOrPhone || user.phone === emailOrPhone
  );
}

// 验证用户密码
export function validatePassword(user: DemoUser, password: string): boolean {
  return user.password === password;
}

// 验证验证码
export function validateVerificationCode(code: string): boolean {
  return code === DEFAULT_VERIFICATION_CODE;
}