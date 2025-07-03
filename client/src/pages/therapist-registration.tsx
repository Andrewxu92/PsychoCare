import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { insertTherapistSchema } from "@shared/schema";
import Navigation from "@/components/navigation";
import { ArrowLeft, Upload, FileText, Award, GraduationCap } from "lucide-react";

// Extend the base schema for registration form
const therapistRegistrationSchema = insertTherapistSchema.extend({
  consultationMethods: z.array(z.string()).min(1, "请至少选择一种咨询方式"),
  specialties: z.array(z.string()).min(1, "请至少选择一个专业领域"),
  credentials: z.array(z.object({
    credentialType: z.string(),
    credentialName: z.string(),
    issuingOrganization: z.string(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    credentialNumber: z.string().optional(),
    documentUrl: z.string().optional(),
  })).optional(),
});

type TherapistRegistrationData = z.infer<typeof therapistRegistrationSchema>;

const specialtyOptions = [
  "心理咨询",
  "婚姻家庭治疗",
  "青少年心理",
  "抑郁症治疗",
  "焦虑症治疗",
  "创伤治疗",
  "认知行为治疗",
  "精神分析",
  "职场心理",
  "亲子关系",
];

const credentialTypes = [
  { value: "license", label: "执业许可证" },
  { value: "certificate", label: "专业认证" },
  { value: "degree", label: "学位证书" },
];

export default function TherapistRegistration() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<TherapistRegistrationData>({
    resolver: zodResolver(therapistRegistrationSchema),
    defaultValues: {
      title: "",
      specialties: [],
      description: "",
      hourlyRate: "0",
      experience: 0,
      education: "",
      certifications: [],
      consultationMethods: [],
      credentials: [],
    },
  });

  const createTherapistMutation = useMutation({
    mutationFn: async (data: TherapistRegistrationData) => {
      const { credentials, ...therapistData } = data;
      
      // Create therapist profile first
      const therapistResponse = await apiRequest('POST', '/api/therapists', {
        ...therapistData,
        hourlyRate: parseFloat(therapistData.hourlyRate),
      });
      const therapist = await therapistResponse.json();

      // Create credentials if provided
      if (credentials && credentials.length > 0) {
        for (const credential of credentials) {
          if (credential.credentialName && credential.issuingOrganization) {
            await apiRequest('POST', `/api/therapists/${therapist.id}/credentials`, {
              ...credential,
              issueDate: credential.issueDate ? new Date(credential.issueDate) : null,
              expiryDate: credential.expiryDate ? new Date(credential.expiryDate) : null,
            });
          }
        }
      }

      return therapist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapists'] });
      toast({
        title: "注册成功",
        description: "您的咨询师资料已提交，管理员将在24小时内审核您的资质。",
      });
      setLocation('/dashboard');
    },
    onError: (error) => {
      toast({
        title: "注册失败",
        description: "创建咨询师资料时出现错误，请重试。",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TherapistRegistrationData) => {
    createTherapistMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl p-8">
              <div className="h-8 bg-neutral-200 rounded mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center p-12">
              <h1 className="text-2xl font-bold mb-4">需要登录</h1>
              <p className="text-neutral-600 mb-6">请先登录后再注册成为咨询师</p>
              <Button onClick={() => window.location.href = "/api/login"}>
                登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首页
          </Button>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              咨询师注册
            </h1>
            <p className="text-lg text-neutral-600">
              加入我们的专业咨询师团队，为客户提供优质的心理健康服务
            </p>
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'
              }`}>
                1
              </div>
              <div className={`h-1 w-16 ${step >= 2 ? 'bg-primary' : 'bg-neutral-200'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'
              }`}>
                2
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2" />
                    基本信息
                  </CardTitle>
                  <CardDescription>
                    请填写您的专业背景和基本信息
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>职业头衔 *</FormLabel>
                        <FormControl>
                          <Input placeholder="例如：临床心理学博士、注册心理咨询师" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialties"
                    render={() => (
                      <FormItem>
                        <FormLabel>专业领域 *</FormLabel>
                        <FormDescription>请选择您的专业咨询领域（可多选）</FormDescription>
                        <div className="grid grid-cols-2 gap-3">
                          {specialtyOptions.map((specialty) => (
                            <FormField
                              key={specialty}
                              control={form.control}
                              name="specialties"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(specialty)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, specialty])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== specialty)
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {specialty}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>从业年限 *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="请输入您的从业年限"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>教育背景</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请描述您的教育背景，包括学位、院校等信息"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>咨询费用（每小时）*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="请输入您的咨询费用"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          请输入您期望的每小时咨询费用（人民币）
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consultationMethods"
                    render={() => (
                      <FormItem>
                        <FormLabel>咨询方式 *</FormLabel>
                        <FormDescription>请选择您提供的咨询方式</FormDescription>
                        <div className="space-y-3">
                          {[
                            { value: "online", label: "在线咨询" },
                            { value: "in-person", label: "面对面咨询" },
                          ].map((method) => (
                            <FormField
                              key={method.value}
                              control={form.control}
                              name="consultationMethods"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(method.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, method.value])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== method.value)
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {method.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>个人简介</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请介绍您的专业背景、咨询理念和擅长领域..."
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setStep(2)}>
                      下一步：上传资质证书
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    资质认证
                  </CardTitle>
                  <CardDescription>
                    请上传您的专业资质证书以完成认证流程
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-900 mb-1">资质认证说明</h3>
                        <p className="text-sm text-blue-700">
                          为确保服务质量，请上传以下任一类型的资质证书：
                        </p>
                        <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                          <li>心理咨询师执业许可证</li>
                          <li>心理学相关学位证书</li>
                          <li>专业心理咨询认证证书</li>
                          <li>其他相关专业资质证明</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Credential upload section - placeholder for now */}
                  <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">上传资质证书</h3>
                    <p className="text-neutral-600 mb-4">
                      支持 PDF、JPG、PNG 格式，单个文件不超过 10MB
                    </p>
                    <Button variant="outline" type="button">
                      选择文件
                    </Button>
                    <p className="text-sm text-neutral-500 mt-2">
                      注：文件上传功能正在开发中，您可以先完成注册，后续补充资质证书
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      上一步
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTherapistMutation.isPending}
                    >
                      {createTherapistMutation.isPending ? "提交中..." : "完成注册"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}