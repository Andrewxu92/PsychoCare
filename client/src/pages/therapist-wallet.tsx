import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AirwallexBeneficiaryForm from "@/components/airwallex-beneficiary-form";
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Plus, 
  Download,
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Form schemas
const beneficiaryFormSchema = z.object({
  accountType: z.enum(["bank", "alipay", "wechat_pay"]),
  bankName: z.string().optional(),
  accountNumber: z.string().min(1, "账户号码是必填项"),
  accountName: z.string().min(1, "账户名是必填项"),
  swiftCode: z.string().optional(),
  isDefault: z.boolean().default(false)
});

const withdrawalFormSchema = z.object({
  amount: z.number().min(1, "提现金额必须大于0"),
  beneficiaryId: z.number().min(1, "请选择收款账户"),
  notes: z.string().optional()
});

type BeneficiaryFormData = z.infer<typeof beneficiaryFormSchema>;
type WithdrawalFormData = z.infer<typeof withdrawalFormSchema>;

export default function TherapistWallet() {
  const { user } = useAuth();
  const typedUser = user as { id: number } | undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAccountNumbers, setShowAccountNumbers] = useState<Record<number, boolean>>({});
  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [showAirwallexForm, setShowAirwallexForm] = useState(false);
  const [, setLocation] = useLocation();

  // Get therapist ID (assuming user is authenticated as therapist)
  const { data: therapist = undefined } = useQuery<{ id: number } | undefined>({
    queryKey: [`/api/therapists/by-user/${typedUser?.id}`],
    enabled: !!typedUser?.id
  });

  const therapistId = therapist?.id;
  console.log('这个是therapistID:', therapistId);

  // Wallet summary query
  const { data: walletSummary, isLoading: summaryLoading } = useQuery<{
    totalEarnings: number;
    availableBalance: number;
    pendingAmount: number;
    withdrawnAmount: number;
  }>({
    queryKey: [`/api/therapists/${therapistId}/wallet/summary`],
    enabled: !!therapistId
  });

  // Earnings query
  const { data: earnings, isLoading: earningsLoading } = useQuery<any[]>({
    queryKey: [`/api/therapists/${therapistId}/earnings`],
    enabled: !!therapistId
  });

  // Beneficiaries query
  const { data: beneficiaries, isLoading: beneficiariesLoading } = useQuery<any[]>({
    queryKey: [`/api/therapists/${therapistId}/beneficiaries`],
    enabled: !!therapistId
  });

  // Withdrawals query
  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery<any[]>({
    queryKey: [`/api/therapists/${therapistId}/withdrawals`],
    enabled: !!therapistId
  });

  // Forms
  const beneficiaryForm = useForm<BeneficiaryFormData>({
    resolver: zodResolver(beneficiaryFormSchema),
    defaultValues: {
      accountType: "bank",
      isDefault: false
    }
  });

  const withdrawalForm = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalFormSchema)
  });

  // Mutations
  const createBeneficiaryMutation = useMutation({
    mutationFn: (data: BeneficiaryFormData) => {
      console.log('API Request Data:', data);
      console.log('therapistId in mutation:', therapistId);
      console.log('API URL:', `/api/therapists/${therapistId}/beneficiaries`);
      return apiRequest("POST", `/api/therapists/${therapistId}/beneficiaries`, data);
    },
    onSuccess: () => {
      console.log('Beneficiary added successfully');
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/beneficiaries`] });
      setBeneficiaryDialogOpen(false);
      beneficiaryForm.reset();
      toast({ title: "收款账户添加成功" });
      setLocation("/bind-beneficiary-success");
    },
    onError: (error) => {
      console.error('Add beneficiary error:', error);
      toast({ title: "添加失败", description: "请检查输入信息", variant: "destructive" });
      setLocation("/bind-beneficiary-failure");
    }
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: (data: WithdrawalFormData) =>
      apiRequest("POST", `/api/therapists/${therapistId}/withdrawals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/withdrawals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/wallet/summary`] });
      setWithdrawalDialogOpen(false);
      withdrawalForm.reset();
      toast({ title: "提现申请已提交" });
    },
    onError: () => {
      toast({ title: "提现申请失败", variant: "destructive" });
    }
  });

  const onBeneficiarySubmit = (data: BeneficiaryFormData) => {
    console.log('onBeneficiarySubmit', data);
    createBeneficiaryMutation.mutate(data);
  };

  const onWithdrawalSubmit = (data: WithdrawalFormData) => {
    createWithdrawalMutation.mutate(data);
  };

  const handleAirwallexSuccess = (beneficiaryData: any) => {
    console.log('Airwallex beneficiary created:', beneficiaryData);
    
    // Create beneficiary record in our database using Airwallex data
    const beneficiaryPayload = {
      accountType: beneficiaryData.type || 'bank',
      bankName: beneficiaryData.bank_details?.bank_name || '',
      accountNumber: beneficiaryData.bank_details?.account_number || beneficiaryData.account_number || '',
      accountName: beneficiaryData.first_name && beneficiaryData.last_name 
        ? `${beneficiaryData.first_name} ${beneficiaryData.last_name}`
        : beneficiaryData.account_name || '',
      swiftCode: beneficiaryData.bank_details?.swift_code || '',
      isDefault: false,
      airwallexBeneficiaryId: beneficiaryData.id // Store Airwallex beneficiary ID
    };

    createBeneficiaryMutation.mutate(beneficiaryPayload);
    setShowAirwallexForm(false);
  };

  const toggleAccountVisibility = (id: number) => {
    setShowAccountNumbers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return `****${accountNumber.slice(-4)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "待处理", variant: "secondary" as const },
      available: { label: "可提现", variant: "default" as const },
      processing: { label: "处理中", variant: "outline" as const },
      completed: { label: "已完成", variant: "default" as const },
      withdrawn: { label: "已提现", variant: "secondary" as const },
      failed: { label: "失败", variant: "destructive" as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!therapistId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">钱包管理</h1>
            <p className="text-gray-600">只有治疗师可以访问钱包功能</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">钱包管理</h1>
          <p className="text-gray-600">管理您的收入、提现和收款账户</p>
        </div>

        {/* Wallet Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总收入</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ¥{summaryLoading ? "..." : (walletSummary?.totalEarnings || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">可提现余额</CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ¥{summaryLoading ? "..." : (walletSummary?.availableBalance || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">待结算</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                ¥{summaryLoading ? "..." : (walletSummary?.pendingAmount || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">已提现</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                ¥{summaryLoading ? "..." : (walletSummary?.withdrawnAmount || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="earnings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white">
            <TabsTrigger value="earnings">收入明细</TabsTrigger>
            <TabsTrigger value="beneficiaries">收款账户</TabsTrigger>
            <TabsTrigger value="withdrawals">提现记录</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>收入明细</CardTitle>
                <CardDescription>查看您的收入记录和状态</CardDescription>
              </CardHeader>
              <CardContent>
                {earningsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg" />
                    ))}
                  </div>
                ) : earnings && earnings.length > 0 ? (
                  <div className="space-y-4">
                    {earnings.map((earning: any) => (
                      <div key={earning.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">预约收入</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(earning.earnedAt), "yyyy年MM月dd日 HH:mm")}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">¥{earning.netAmount}</p>
                          <p className="text-xs text-gray-500">手续费: ¥{earning.platformFee}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(earning.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无收入记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beneficiaries Tab */}
          <TabsContent value="beneficiaries" className="space-y-6">
            {showAirwallexForm ? (
              <AirwallexBeneficiaryForm 
                onSuccess={handleAirwallexSuccess}
                onClose={() => setShowAirwallexForm(false)}
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>收款账户</CardTitle>
                    <CardDescription>管理您的收款账户信息</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => setShowAirwallexForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      使用Airwallex添加
                    </Button>
                    <Dialog open={beneficiaryDialogOpen} onOpenChange={setBeneficiaryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          手动添加
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>添加收款账户</DialogTitle>
                          <DialogDescription>
                            请填写完整的收款账户信息
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...beneficiaryForm}>
                          <form onSubmit={beneficiaryForm.handleSubmit(onBeneficiarySubmit)} className="space-y-4">
                        <FormField
                          control={beneficiaryForm.control}
                          name="accountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>账户类型</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择账户类型" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bank">银行账户</SelectItem>
                                  <SelectItem value="alipay">支付宝</SelectItem>
                                  <SelectItem value="wechat_pay">微信支付</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {beneficiaryForm.watch("accountType") === "bank" && (
                          <FormField
                            control={beneficiaryForm.control}
                            name="bankName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>银行名称</FormLabel>
                                <FormControl>
                                  <Input placeholder="请输入银行名称" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={beneficiaryForm.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>账户号码</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入账户号码" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={beneficiaryForm.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>账户名</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入账户名" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                            <div className="flex justify-end space-x-2">
                              <Button type="button" variant="outline" onClick={() => setBeneficiaryDialogOpen(false)}>
                                取消
                              </Button>
                              <Button type="submit" disabled={createBeneficiaryMutation.isPending}>
                                {createBeneficiaryMutation.isPending ? "添加中..." : "添加"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
              <CardContent>
                {beneficiariesLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg" />
                    ))}
                  </div>
                ) : beneficiaries && beneficiaries.length > 0 ? (
                  <div className="space-y-4">
                    {beneficiaries.map((beneficiary: any) => (
                      <div key={beneficiary.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {beneficiary.accountType === "bank" ? (
                              <Building2 className="h-8 w-8 text-blue-600" />
                            ) : (
                              <CreditCard className="h-8 w-8 text-green-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{beneficiary.accountName}</p>
                              {beneficiary.isDefault && (
                                <Badge variant="default">默认</Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm text-gray-600">
                                {showAccountNumbers[beneficiary.id] 
                                  ? beneficiary.accountNumber 
                                  : maskAccountNumber(beneficiary.accountNumber)
                                }
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAccountVisibility(beneficiary.id)}
                              >
                                {showAccountNumbers[beneficiary.id] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {beneficiary.bankName && (
                              <p className="text-sm text-gray-500">{beneficiary.bankName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {beneficiary.isActive ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无收款账户</p>
                    <p className="text-sm">添加收款账户以便提现</p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>提现记录</CardTitle>
                  <CardDescription>查看您的提现申请和状态</CardDescription>
                </div>
                <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!walletSummary?.availableBalance || walletSummary.availableBalance === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      申请提现
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>申请提现</DialogTitle>
                      <DialogDescription>
                        可提现余额: ¥{walletSummary?.availableBalance || 0}
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...withdrawalForm}>
                      <form onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
                        <FormField
                          control={withdrawalForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>提现金额</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="请输入提现金额" 
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={withdrawalForm.control}
                          name="beneficiaryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>收款账户</FormLabel>
                              <Select onValueChange={(value) => field.onChange(Number(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择收款账户" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {beneficiaries?.map((beneficiary: any) => (
                                    <SelectItem key={beneficiary.id} value={beneficiary.id.toString()}>
                                      {beneficiary.accountName} ({maskAccountNumber(beneficiary.accountNumber)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={withdrawalForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>备注 (可选)</FormLabel>
                              <FormControl>
                                <Input placeholder="提现备注" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
                            取消
                          </Button>
                          <Button type="submit" disabled={createWithdrawalMutation.isPending}>
                            {createWithdrawalMutation.isPending ? "提交中..." : "提交申请"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg" />
                    ))}
                  </div>
                ) : withdrawals && withdrawals.length > 0 ? (
                  <div className="space-y-4">
                    {withdrawals.map((withdrawal: any) => (
                      <div key={withdrawal.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">提现申请</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(withdrawal.requestedAt || withdrawal.createdAt), "yyyy年MM月dd日 HH:mm")}
                          </p>
                          {withdrawal.notes && (
                            <p className="text-sm text-gray-500">备注: {withdrawal.notes}</p>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-red-600">-¥{withdrawal.amount}</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Download className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无提现记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>钱包设置</CardTitle>
                <CardDescription>管理您的钱包偏好设置</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center py-12 text-gray-500">
                    <p>钱包设置功能即将推出</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}