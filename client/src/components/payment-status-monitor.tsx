import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

/**
 * 支付状态监控组件
 * 用于实时监控Airwallex支付状态，并在支付成功后创建或更新预约
 */
interface PaymentStatusMonitorProps {
  /** Airwallex支付意图ID */
  paymentIntentId: string;
  /** 预约数据 */
  appointmentData: {
    therapistId: number;
    appointmentDate: Date;
    consultationType: 'online' | 'in-person';
    clientNotes: string;
    price: number;
  };
  /** 支付成功回调 */
  onSuccess: (appointment: any) => void;
  /** 支付失败回调 */
  onFailure?: (error: string) => void;
  /** 是否为重新支付模式 */
  isRetryPayment?: boolean;
  /** 现有预约ID（重新支付时使用） */
  existingAppointmentId?: number;
}

export default function PaymentStatusMonitor({
  paymentIntentId,
  appointmentData,
  onSuccess,
  onFailure,
  isRetryPayment = false,
  existingAppointmentId
}: PaymentStatusMonitorProps) {
  // 组件状态管理
  const [status, setStatus] = useState<'checking' | 'succeeded' | 'failed' | 'timeout'>('checking');
  const [countdown, setCountdown] = useState(60); // 监控超时倒计时（60秒）
  const [currentCheck, setCurrentCheck] = useState(0); // 当前检查次数
  const [errorMessage, setErrorMessage] = useState<string>(''); // 错误信息

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;

    /**
     * 检查支付状态的核心函数
     * 每5秒检查一次，最多检查12次（60秒）
     */
    const checkPaymentStatus = async () => {
      try {
        console.log(`第${currentCheck + 1}次检查支付状态...`);
        
        // 调用后端API查询Airwallex支付状态
        const response = await apiRequest("GET", `/api/payments/intent/${paymentIntentId}/status`);
        const statusResponse = await response.json();
        
        console.log("Payment status response:", statusResponse);
        
        // 支付成功处理
        if (statusResponse.status === 'SUCCEEDED') {
          setStatus('succeeded');
          clearInterval(intervalId);
          clearInterval(countdownId);
          
          try {
            if (isRetryPayment && existingAppointmentId) {
              // 重新支付模式：更新现有预约的支付状态
              console.log("Updating existing appointment payment status:", existingAppointmentId);
              
              const response = await apiRequest("PUT", `/api/appointments/${existingAppointmentId}`, {
                paymentStatus: 'paid',
                paymentIntentId: paymentIntentId
              });
              
              const appointment = await response.json();
              console.log("Updated appointment:", appointment);
              
              // 刷新预约列表缓存，确保UI实时更新
              queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
              
              onSuccess(appointment);
            } else {
              // 新预约模式：创建新的预约记录
              console.log("Creating appointment with data:", {
                therapistId: appointmentData.therapistId,
                appointmentDate: appointmentData.appointmentDate,
                consultationType: appointmentData.consultationType,
                clientNotes: appointmentData.clientNotes,
                price: Number(appointmentData.price || 0).toFixed(2),
                status: 'pending', // 待咨询师确认
                paymentStatus: 'paid', // 支付已完成
                paymentIntentId: paymentIntentId
              });
              
              const response = await apiRequest("POST", "/api/appointments", {
                therapistId: appointmentData.therapistId,
                appointmentDate: appointmentData.appointmentDate,
                consultationType: appointmentData.consultationType,
                clientNotes: appointmentData.clientNotes,
                price: Number(appointmentData.price || 0).toFixed(2),
                status: 'pending', // 支付成功后状态为pending，等待咨询师确认
                paymentStatus: 'paid',
                paymentIntentId: paymentIntentId
              });
              
              const appointment = await response.json();
              console.log("Created appointment:", appointment);
              
              // 刷新预约列表缓存，确保UI实时更新
              queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
              
              onSuccess(appointment);
            }
          } catch (confirmError: any) {
            console.error("处理预约失败:", confirmError);
            setStatus('failed');
            setErrorMessage("支付成功但处理预约失败，请联系客服");
            onFailure?.("支付成功但处理预约失败");
          }
        } 
        // 支付失败处理
        else if (statusResponse.status === 'FAILED' || statusResponse.status === 'CANCELLED') {
          setStatus('failed');
          setErrorMessage(`支付失败: ${statusResponse.status}`);
          clearInterval(intervalId);
          clearInterval(countdownId);
          onFailure?.(`支付失败: ${statusResponse.status}`);
        }
        
        // 更新检查次数
        setCurrentCheck(prev => prev + 1);
      } catch (error: any) {
        console.error("检查支付状态时出错:", error);
        
        // 超过最大检查次数则标记为失败
        if (currentCheck >= 12) {
          setStatus('failed');
          setErrorMessage("检查支付状态失败，请联系客服");
          clearInterval(intervalId);
          clearInterval(countdownId);
          onFailure?.("检查支付状态失败");
        }
      }
    };

    // 立即检查一次
    checkPaymentStatus();

    // 每5秒检查一次
    intervalId = setInterval(checkPaymentStatus, 5000);

    // 倒计时
    countdownId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setStatus('timeout');
          setErrorMessage("支付状态检查超时，请刷新页面或联系客服");
          clearInterval(intervalId);
          clearInterval(countdownId);
          onFailure?.("支付状态检查超时");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearInterval(countdownId);
    };
  }, [paymentIntentId, appointmentData, currentCheck, onSuccess, onFailure]);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
      case 'succeeded':
        return <CheckCircle className="h-12 w-12 text-green-600" />;
      case 'failed':
      case 'timeout':
        return <AlertCircle className="h-12 w-12 text-red-600" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'checking':
        return '正在确认支付状态...';
      case 'succeeded':
        return '支付成功！';
      case 'failed':
        return '支付失败';
      case 'timeout':
        return '检查超时';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'checking':
        return `正在验证您的支付，请稍候... (${countdown}秒)`;
      case 'succeeded':
        return '您的预约已成功创建，正在跳转...';
      case 'failed':
        return errorMessage || '支付未成功，请重新尝试';
      case 'timeout':
        return errorMessage || '支付状态检查超时，请刷新页面重试';
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">预约确认中</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <div className="flex flex-col items-center space-y-6">
          {getStatusIcon()}
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{getStatusTitle()}</h3>
            <p className="text-gray-600">{getStatusDescription()}</p>
          </div>

          {status === 'checking' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">
                检查进度: {currentCheck}/12
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentCheck / 12) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {(status === 'failed' || status === 'timeout') && (
            <Button 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              重新尝试
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}