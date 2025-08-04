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
  EyeOff,
  ArrowDownToLine,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Form schemas - Updated to match database schema
const beneficiaryFormSchema = z.object({
  accountType: z.string(),
  bankName: z.string().optional(),
  accountNumber: z.string().min(1, "账户号码是必填项"),
  accountHolderName: z.string().min(1, "账户持有人姓名是必填项"),
  currency: z.string().default("USD"),
  airwallexBeneficiaryId: z.string().min(1, "Airwallex受益人ID是必填项"),
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
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<any>(null);
  const [beneficiaryDetailsOpen, setBeneficiaryDetailsOpen] = useState(false);
  const [isBindingInProgress, setIsBindingInProgress] = useState(false);
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
    mutationFn: (data: any) => {
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
      setShowAirwallexForm(false);
      setIsBindingInProgress(false);
      toast({ 
        title: "收款账户绑定成功",
        description: "您的收款账户已成功添加到系统中"
      });
    },
    onError: (error) => {
      console.error('Add beneficiary error:', error);
      setShowAirwallexForm(false);
      setIsBindingInProgress(false);
      toast({ 
        title: "绑定失败", 
        description: "请检查输入信息或重试", 
        variant: "destructive" 
      });
    }
  });

  const deleteBeneficiaryMutation = useMutation({
    mutationFn: (beneficiaryId: number) =>
      apiRequest("DELETE", `/api/therapists/${therapistId}/beneficiaries/${beneficiaryId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/beneficiaries`] });
      toast({ title: "收款账户已删除" });
    },
    onError: () => {
      toast({ title: "删除失败", variant: "destructive" });
    }
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: (data: WithdrawalFormData) =>
      apiRequest("POST", `/api/therapists/${therapistId}/withdrawals`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/withdrawals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/wallet/summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/therapists/${therapistId}/earnings`] });
      setWithdrawalDialogOpen(false);
      withdrawalForm.reset();
      toast({ 
        title: "提现申请已提交",
        description: "您的提现申请已成功提交，我们会尽快处理" 
      });
    },
    onError: (error: any) => {
      console.error('Withdrawal error:', error);
      const errorMessage = error.message || "请稍后重试";
      toast({ 
        title: "提现失败", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const onBeneficiarySubmit = (data: BeneficiaryFormData) => {
    console.log('onBeneficiarySubmit', data);
    console.log('therapistId in onBeneficiarySubmit:', therapistId);
    console.log('createBeneficiaryMutation:', createBeneficiaryMutation);
    createBeneficiaryMutation.mutate(data);
    console.log('mutate called');
  };

  const onWithdrawalSubmit = (data: WithdrawalFormData) => {
    createWithdrawalMutation.mutate(data);
  };

  const handleAirwallexSuccess = (beneficiaryData: any) => {
    console.log('Beneficiary form submit result:', beneficiaryData);
    console.log('Airwallex SDK raw result:', JSON.stringify(beneficiaryData, null, 2));
    
    // Show binding progress overlay
    setIsBindingInProgress(true);
    setShowAirwallexForm(false);
    
    // Send complete Airwallex SDK result to API
    console.log('Sending complete Airwallex data to API:', beneficiaryData);
    createBeneficiaryMutation.mutate(beneficiaryData);
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

  const handleDeleteBeneficiary = (beneficiaryId: number) => {
    if (confirm("确定要删除这个收款账户吗？")) {
      deleteBeneficiaryMutation.mutate(beneficiaryId);
    }
  };

  const handleViewBeneficiaryDetails = (beneficiary: any) => {
    setSelectedBeneficiary(beneficiary);
    setBeneficiaryDetailsOpen(true);
  };

  const getCurrencyFlag = (currency: string) => {
    const flags = {
      'USD': '🇺🇸',
      'CNY': '🇨🇳', 
      'EUR': '🇪🇺',
      'JPY': '🇯🇵',
      'GBP': '🇬🇧',
      'HKD': '🇭🇰',
      'SGD': '🇸🇬',
      'AUD': '🇦🇺',
      'CAD': '🇨🇦'
    };
    return flags[currency as keyof typeof flags] || '💰';
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
              <Button 
                onClick={() => setWithdrawalDialogOpen(true)} 
                className="w-full mt-3"
                size="sm"
                disabled={!walletSummary?.availableBalance || walletSummary.availableBalance <= 0}
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                申请提现
              </Button>
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
                          name="accountHolderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>账户持有人姓名</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入账户持有人姓名" {...field} />
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
                              <p className="font-medium">{beneficiary.accountHolderName}</p>
                              <span className="text-lg">{getCurrencyFlag(beneficiary.currency)}</span>
                              <Badge variant="outline" className="text-xs">
                                {beneficiary.currency}
                              </Badge>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBeneficiaryDetails(beneficiary)}
                          >
                            查看详情
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteBeneficiary(beneficiary.id)}
                            disabled={deleteBeneficiaryMutation.isPending}
                          >
                            删除
                          </Button>
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
                        {/* 可提现余额提示 */}
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">可提现余额</div>
                          <div className="text-xl font-semibold text-blue-600">
                            ¥{walletSummary?.availableBalance?.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        <FormField
                          control={withdrawalForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>提现金额</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                                  <Input 
                                    type="number" 
                                    placeholder="0.00"
                                    className="pl-8"
                                    max={walletSummary?.availableBalance || 0}
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                              <div className="text-xs text-gray-500">
                                最大可提现金额: ¥{walletSummary?.availableBalance?.toFixed(2) || '0.00'}
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={withdrawalForm.control}
                          name="beneficiaryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>选择收款账户</FormLabel>
                              <Select onValueChange={(value) => field.onChange(Number(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="请选择收款账户" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {beneficiaries?.map((beneficiary: any) => (
                                    <SelectItem key={beneficiary.id} value={beneficiary.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">
                                          {beneficiary.currency === 'USD' ? '🇺🇸' :
                                           beneficiary.currency === 'HKD' ? '🇭🇰' :
                                           beneficiary.currency === 'CNY' ? '🇨🇳' :
                                           beneficiary.currency === 'EUR' ? '🇪🇺' :
                                           beneficiary.currency === 'GBP' ? '🇬🇧' :
                                           beneficiary.currency === 'SGD' ? '🇸🇬' :
                                           beneficiary.currency === 'AUD' ? '🇦🇺' :
                                           beneficiary.currency === 'JPY' ? '🇯🇵' : '💳'}
                                        </span>
                                        <div>
                                          <div className="font-medium">{beneficiary.accountHolderName}</div>
                                          <div className="text-sm text-gray-500">
                                            {maskAccountNumber(beneficiary.accountNumber)}
                                          </div>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                              {!beneficiaries?.length && (
                                <p className="text-sm text-orange-600">请先添加收款账户</p>
                              )}
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

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
                            取消
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createWithdrawalMutation.isPending || !beneficiaries?.length || !walletSummary?.availableBalance}
                          >
                            {createWithdrawalMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                提交中...
                              </>
                            ) : (
                              "提交申请"
                            )}
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

        {/* Beneficiary Details Dialog */}
        <Dialog open={beneficiaryDetailsOpen} onOpenChange={setBeneficiaryDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>收款账户详细信息</DialogTitle>
            </DialogHeader>
            {selectedBeneficiary && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">账户持有人</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBeneficiary.accountHolderName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">账户类型</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBeneficiary.accountType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">账户号码</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBeneficiary.accountNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">银行名称</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBeneficiary.bankName || '未提供'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">货币</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBeneficiary.currency}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Airwallex ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono text-xs">{selectedBeneficiary.airwallexBeneficiaryId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">状态</label>
                    <p className="mt-1">
                      {selectedBeneficiary.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          活跃
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          非活跃
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">创建时间</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedBeneficiary.createdAt 
                        ? format(new Date(selectedBeneficiary.createdAt), "yyyy-MM-dd HH:mm")
                        : '未知'
                      }
                    </p>
                  </div>
                </div>
                
                {selectedBeneficiary.airwallexRawData && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Airwallex 原始数据</label>
                    <div className="mt-2 bg-gray-50 p-4 rounded-lg">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(selectedBeneficiary.airwallexRawData), null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setBeneficiaryDetailsOpen(false)}>关闭</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Binding Progress Overlay */}
        {isBindingInProgress && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center shadow-xl">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">正在绑定收款账户</h3>
              <p className="text-gray-600 text-sm">
                正在将您的银行账户信息保存到系统中，请稍候...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}