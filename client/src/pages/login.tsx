import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Mail, Phone, Key, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  emailOrPhone: z.string().min(1, "请输入邮箱或手机号"),
  password: z.string().optional(),
  verificationCode: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [loginMethod, setLoginMethod] = useState<"password" | "code">("password");
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
      verificationCode: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("/api/auth/demo-login", "POST", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "登录成功",
        description: "正在跳转到主页...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "登录失败",
        description: error.message || "请检查您的登录信息",
        variant: "destructive",
      });
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async (emailOrPhone: string) => {
      const response = await apiRequest("/api/auth/send-code", "POST", { emailOrPhone });
      return response;
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: "验证码已发送",
        description: "请检查您的邮箱或短信",
      });
    },
    onError: (error: any) => {
      toast({
        title: "发送失败",
        description: error.message || "验证码发送失败，请重试",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    if (loginMethod === "password" && !data.password) {
      toast({
        title: "请输入密码",
        variant: "destructive",
      });
      return;
    }
    if (loginMethod === "code" && !data.verificationCode) {
      toast({
        title: "请输入验证码",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(data);
  };

  const handleSendCode = () => {
    const emailOrPhone = form.getValues("emailOrPhone");
    if (!emailOrPhone) {
      toast({
        title: "请先输入邮箱或手机号",
        variant: "destructive",
      });
      return;
    }
    sendCodeMutation.mutate(emailOrPhone);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* 演示账户信息 */}
        <Card className="border-primary/20 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Heart className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">演示账户</CardTitle>
            </div>
            <CardDescription>
              使用以下演示账户体验平台功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* 来访者账户 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">来访者账户</Badge>
                </div>
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">邮箱: client@demo.com</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">手机: 13800138001</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">密码: demo123</span>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    功能：预约咨询师、查看预约记录、撰写评价
                  </div>
                </div>
              </div>

              {/* 咨询师账户 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="default">咨询师账户</Badge>
                </div>
                <div className="space-y-2 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="text-sm">邮箱: therapist@demo.com</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-green-600" />
                    <span className="text-sm">手机: 13800138002</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4 text-green-600" />
                    <span className="text-sm">密码: demo123</span>
                  </div>
                  <div className="text-xs text-green-600 mt-2">
                    功能：管理个人资料、查看客户预约、确认预约时间
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 登录表单 */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">登录账户</CardTitle>
            <CardDescription>
              选择登录方式进入平台
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={loginMethod} onValueChange={(value) => setLoginMethod(value as "password" | "code")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">密码登录</TabsTrigger>
                <TabsTrigger value="code">验证码登录</TabsTrigger>
              </TabsList>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
                  <FormField
                    control={form.control}
                    name="emailOrPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>邮箱或手机号</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请输入邮箱或手机号"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <TabsContent value="password" className="mt-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>密码</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="请输入密码"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="code" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendCode}
                          disabled={sendCodeMutation.isPending}
                          className="whitespace-nowrap"
                        >
                          {sendCodeMutation.isPending ? "发送中..." : "发送验证码"}
                        </Button>
                        {codeSent && (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            验证码已发送
                          </div>
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name="verificationCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>验证码</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="请输入6位验证码"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "登录中..." : "登录"}
                  </Button>
                </form>
              </Form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}