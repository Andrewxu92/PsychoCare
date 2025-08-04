import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import BookingCalendar from "@/components/booking-calendar";
import PaymentForm from "@/components/payment-form-simple";
import PaymentStatusMonitor from "@/components/payment-status-monitor";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Video, Users, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import type { TherapistWithUser } from "@shared/schema";

type BookingStep = 'therapist' | 'datetime' | 'details' | 'payment' | 'monitoring' | 'confirmation';

interface BookingData {
  therapistId: number;
  appointmentDate: Date;
  consultationType: 'online' | 'in-person';
  clientNotes: string;
  price: number;
}

export default function Booking() {
  const { therapistId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<BookingStep>('therapist');
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    therapistId: therapistId ? parseInt(therapistId) : undefined,
    consultationType: 'online',
    clientNotes: '',
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [finalAppointment, setFinalAppointment] = useState<any>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能预约咨询。",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: therapist, isLoading: therapistLoading } = useQuery<TherapistWithUser>({
    queryKey: [`/api/therapists/${therapistId}`],
    enabled: !!therapistId,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest('POST', '/api/appointments', appointmentData);
      return response.json();
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      // 跳转到预约成功页面
      setLocation(`/booking-success/${appointment.id}`);
      toast({
        title: "预约成功",
        description: "您的咨询预约已成功创建，请等待咨询师确认。",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "登录已过期",
          description: "正在重新登录...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "预约失败",
        description: "创建预约时出现错误，请重试。",
        variant: "destructive",
      });
    },
  });

  if (authLoading || therapistLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl p-8 mb-8">
              <div className="h-8 bg-neutral-200 rounded mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!therapist && therapistId) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">咨询师未找到</h1>
            <p className="text-neutral-600 mb-6">请返回咨询师列表重新选择</p>
            <Button onClick={() => setLocation('/therapists')}>
              返回咨询师列表
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'therapist', title: '选择咨询师', icon: Users },
    { id: 'datetime', title: '选择时间', icon: Calendar },
    { id: 'details', title: '填写信息', icon: Clock },
    { id: 'payment', title: '确认支付', icon: Video },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleNext = () => {
    if (currentStep === 'therapist' && therapist) {
      setBookingData(prev => ({ 
        ...prev, 
        therapistId: therapist.id,
        price: Number(therapist.hourlyRate)
      }));
      setCurrentStep('datetime');
    } else if (currentStep === 'datetime' && selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(parseInt(hours), parseInt(minutes));
      
      setBookingData(prev => ({ ...prev, appointmentDate }));
      setCurrentStep('details');
    } else if (currentStep === 'details') {
      setCurrentStep('payment');
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'datetime') {
      setCurrentStep('therapist');
    } else if (currentStep === 'details') {
      setCurrentStep('datetime');
    } else if (currentStep === 'payment') {
      setCurrentStep('details');
    }
  };

  const handlePaymentSuccess = (paymentResult?: any) => {
    console.log('Payment succeeded:', paymentResult);
    // 支付成功后获取payment intent ID并进入监控阶段
    const intentId = paymentResult?.intent?.payment_intent_id || 
                    paymentResult?.intent?.id ||
                    paymentResult?.id;
    
    if (intentId) {
      setPaymentIntentId(intentId);
      setCurrentStep('monitoring');
    } else {
      toast({
        title: "支付信息异常",
        description: "无法获取支付ID，请联系客服",
        variant: "destructive",
      });
    }
  };

  const handlePaymentFailure = () => {
    console.log('Payment failed');
    toast({
      title: "支付失败",
      description: "支付过程中出现问题，请重新尝试",
      variant: "destructive",
    });
    setCurrentStep('payment'); // 回到支付步骤
  };

  const handleMonitoringSuccess = (appointment: any) => {
    setFinalAppointment(appointment);
    setCurrentStep('confirmation');
    toast({
      title: "预约成功",
      description: "您的咨询预约已成功创建！",
    });
  };

  const handleMonitoringFailure = (error: string) => {
    toast({
      title: "预约创建失败",
      description: error,
      variant: "destructive",
    });
    setCurrentStep('payment'); // 回到支付步骤重试
  };

  const handleConfirmBooking = () => {
    if (!bookingData.therapistId || !bookingData.appointmentDate || !bookingData.price) {
      toast({
        title: "信息不完整",
        description: "请确保所有必要信息都已填写。",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate({
      therapistId: bookingData.therapistId,
      appointmentDate: bookingData.appointmentDate,
      consultationType: bookingData.consultationType,
      clientNotes: bookingData.clientNotes,
      price: Number(bookingData.price).toFixed(2), // 保持原始价格格式
      status: 'pending',
      paymentStatus: 'pending',
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'T';
  };

  if (currentStep === 'confirmation') {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center p-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">预约创建成功！</h1>
            <p className="text-lg text-neutral-600 mb-8">
              您的咨询预约已成功创建并确认，咨询师已收到您的预约信息。
            </p>
            {finalAppointment && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-lg mb-4">预约详情</h3>
                <div className="space-y-2">
                  <p><span className="font-medium">预约ID:</span> {finalAppointment.id}</p>
                  <p><span className="font-medium">咨询师:</span> {therapist?.user.firstName} {therapist?.user.lastName}</p>
                  <p><span className="font-medium">时间:</span> {new Date(finalAppointment.appointmentDate).toLocaleString('zh-CN')}</p>
                  <p><span className="font-medium">费用:</span> HK${Number(finalAppointment.price).toFixed(0)}</p>
                  <p><span className="font-medium">状态:</span> <Badge className="bg-green-100 text-green-800">已确认</Badge></p>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Button onClick={() => setLocation('/dashboard')}>
                查看我的预约
              </Button>
              <Button variant="outline" onClick={() => setLocation('/therapists')}>
                继续浏览咨询师
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">预约咨询</h1>
          <p className="text-lg text-neutral-600">简单几步，开始您的心理健康之旅</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8 max-w-2xl mx-auto">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div key={step.id} className="flex items-center space-x-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : isCompleted 
                        ? 'bg-green-500 text-white' 
                        : 'bg-neutral-300 text-neutral-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-primary' : 'text-neutral-600'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-0.5 bg-neutral-300 ml-4"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {currentStep === 'therapist' && '确认咨询师'}
                  {currentStep === 'datetime' && '选择时间'}
                  {currentStep === 'details' && '填写详细信息'}
                  {currentStep === 'payment' && '确认支付'}
                  {currentStep === 'monitoring' && '确认预约'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Therapist Selection */}
                {currentStep === 'therapist' && therapist && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={therapist.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(therapist.user.firstName, therapist.user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-neutral-900">
                          {therapist.user.firstName} {therapist.user.lastName}
                        </h3>
                        <p className="text-neutral-600">{therapist.title}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {therapist.specialties?.slice(0, 3).map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-semibold text-primary">
                          HK${Number(therapist.hourlyRate).toFixed(0)}
                        </span>
                        <span className="text-sm text-neutral-600">/次</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* DateTime Selection */}
                {currentStep === 'datetime' && therapist && (
                  <BookingCalendar
                    therapistId={therapist.id}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    onDateSelect={setSelectedDate}
                    onTimeSelect={setSelectedTime}
                  />
                )}

                {/* Details Form */}
                {currentStep === 'details' && (
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-semibold">咨询方式</Label>
                      <RadioGroup
                        value={bookingData.consultationType}
                        onValueChange={(value: 'online' | 'in-person') => 
                          setBookingData(prev => ({ ...prev, consultationType: value }))
                        }
                        className="mt-3"
                      >
                        <div className="flex items-center space-x-2 p-4 border rounded-lg">
                          <RadioGroupItem value="online" id="online" />
                          <Label htmlFor="online" className="flex items-center space-x-2 cursor-pointer">
                            <Video className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-medium">在线视频咨询</div>
                              <div className="text-sm text-neutral-600">通过视频通话进行咨询</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-4 border rounded-lg">
                          <RadioGroupItem value="in-person" id="in-person" />
                          <Label htmlFor="in-person" className="flex items-center space-x-2 cursor-pointer">
                            <Users className="h-5 w-5 text-primary" />
                            <div>
                              <div className="font-medium">面对面咨询</div>
                              <div className="text-sm text-neutral-600">到咨询室进行面对面咨询</div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label htmlFor="client-notes" className="text-base font-semibold">
                        咨询描述 (可选)
                      </Label>
                      <Textarea
                        id="client-notes"
                        placeholder="请简要描述您希望咨询的问题，这将帮助咨询师更好地准备..."
                        value={bookingData.clientNotes}
                        onChange={(e) => setBookingData(prev => ({ ...prev, clientNotes: e.target.value }))}
                        className="mt-2"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* Payment */}
                {currentStep === 'payment' && therapist && bookingData.appointmentDate && (
                  <PaymentForm
                    amount={Number(therapist.hourlyRate)}
                    appointmentData={bookingData}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentFailure={handlePaymentFailure}
                    isLoading={createAppointmentMutation.isPending}
                  />
                )}

                {/* Payment Status Monitoring */}
                {currentStep === 'monitoring' && paymentIntentId && (
                  <PaymentStatusMonitor
                    paymentIntentId={paymentIntentId}
                    appointmentData={bookingData}
                    onSuccess={handleMonitoringSuccess}
                    onFailure={handleMonitoringFailure}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Booking Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>预约摘要</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {therapist && (
                  <>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={therapist.user.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(therapist.user.firstName, therapist.user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-neutral-900">
                          {therapist.user.firstName} {therapist.user.lastName}
                        </div>
                        <div className="text-sm text-neutral-600">{therapist.title}</div>
                      </div>
                    </div>
                    
                    <Separator />
                  </>
                )}

                {selectedDate && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-neutral-500" />
                    <div>
                      <div className="font-medium text-neutral-900">日期</div>
                      <div className="text-sm text-neutral-600">
                        {selectedDate.toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {selectedTime && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-neutral-500" />
                    <div>
                      <div className="font-medium text-neutral-900">时间</div>
                      <div className="text-sm text-neutral-600">{selectedTime}</div>
                    </div>
                  </div>
                )}

                {bookingData.consultationType && (
                  <div className="flex items-center space-x-3">
                    {bookingData.consultationType === 'online' ? (
                      <Video className="h-5 w-5 text-neutral-500" />
                    ) : (
                      <Users className="h-5 w-5 text-neutral-500" />
                    )}
                    <div>
                      <div className="font-medium text-neutral-900">咨询方式</div>
                      <div className="text-sm text-neutral-600">
                        {bookingData.consultationType === 'online' ? '在线视频咨询' : '面对面咨询'}
                      </div>
                    </div>
                  </div>
                )}

                {therapist && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">总计</span>
                      <span className="font-semibold text-xl text-primary">
                        HK${Number(therapist.hourlyRate).toFixed(0)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 'therapist' || currentStep === 'monitoring'}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            上一步
          </Button>
          
          {currentStep !== 'payment' && currentStep !== 'monitoring' ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 'therapist' && !therapist) ||
                (currentStep === 'datetime' && (!selectedDate || !selectedTime))
              }
            >
              下一步
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
