import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Shield, Lock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentFormProps {
  amount: number;
  appointmentData?: any;
  onPaymentSuccess: (result?: any) => void;
  isLoading?: boolean;
}

export default function PaymentForm({ amount, appointmentData, onPaymentSuccess, isLoading = false }: PaymentFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAirwallexLoaded, setIsAirwallexLoaded] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [customer, setCustomer] = useState<any>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const dropInRef = useRef<any>(null);

  // Initialize Airwallex and create customer/payment intent
  useEffect(() => {
    initializePayment();
  }, [amount]);

  const initializePayment = async () => {
    try {
      // Check if Airwallex is already loaded
      if (!window.Airwallex) {
        await loadAirwallexSDK();
      }

      // Initialize Airwallex with demo credentials
      window.Airwallex.init({
        env: 'demo',
        origin: window.location.origin,
      });

      // Create customer
      const customerRes = await apiRequest('POST', '/api/payments/customer', {});
      const customerResponse = await customerRes.json();
      setCustomer(customerResponse);

      // Create payment intent
      const intentRes = await apiRequest('POST', '/api/payments/intent', {
        amount: amount,
        currency: 'CNY',
        customer_id: customerResponse.id
      });
      const intentResponse = await intentRes.json();
      setPaymentIntent(intentResponse);

      // Create drop-in element
      createDropInElement(intentResponse, customerResponse);

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setPaymentError('支付系统初始化失败，请重试');
    }
  };

  const loadAirwallexSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.Airwallex) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.airwallex.com/assets/bundle.x.js';
      script.async = true;
      script.onload = () => {
        setIsAirwallexLoaded(true);
        resolve();
      };
      script.onerror = () => {
        setPaymentError('支付系统加载失败，请刷新页面重试');
        reject(new Error('Failed to load Airwallex SDK'));
      };
      
      document.head.appendChild(script);
    });
  };

  const createDropInElement = (intent: any, customer: any) => {
    try {
      // Create drop-in element with payment intent and demo client ID
      const element = window.Airwallex.createElement('dropIn', {
        intent_id: intent.id,
        client_secret: intent.client_secret,
        currency: intent.currency,
        customer_id: customer.id,
        client_id: 'FgTDjfg9SEGV4vsliPYZzQ', // Demo client ID
        mode: 'payment' // For one-time payment
      });

      // Mount the element
      element.mount('#airwallex-dropin-element');
      dropInRef.current = element;

      // Handle events
      element.on('ready', () => {
        console.log('Airwallex drop-in element is ready');
        setIsAirwallexLoaded(true);
      });

      element.on('error', (event: any) => {
        console.error('Airwallex element error:', event);
        setPaymentError(event.error?.message || '支付过程中出现错误');
      });

      element.on('success', (event: any) => {
        console.log('Payment successful:', event);
        handlePaymentSuccess(event);
      });

    } catch (error) {
      console.error('Drop-in element creation error:', error);
      setPaymentError('支付组件初始化失败');
    }
  };

  const handlePayment = async () => {
    if (!acceptedTerms) {
      setPaymentError('请先同意服务条款和隐私政策');
      return;
    }

    if (!dropInRef.current || !paymentIntent) {
      setPaymentError('支付系统尚未准备就绪，请稍候重试');
      return;
    }

    setPaymentError('');
    setIsProcessing(true);

    try {
      // In development, simulate payment flow
      if (import.meta.env.NODE_ENV === 'development') {
        // Simulate payment processing
        setTimeout(async () => {
          await handlePaymentSuccess({
            payment_intent: {
              id: paymentIntent.id,
              status: 'succeeded'
            }
          });
        }, 2000);
        return;
      }

      // In production, trigger Airwallex payment confirmation
      // The actual payment confirmation will be handled by the 'success' event
      await dropInRef.current.confirmPayment();

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError(error.message || '支付过程中出现错误');
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (event: any) => {
    try {
      // Confirm payment with backend
      const confirmRes = await apiRequest('POST', '/api/payments/confirm', {
        payment_intent_id: paymentIntent.id,
        appointment_data: appointmentData
      });
      const result = await confirmRes.json();

      onPaymentSuccess(result);
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      setPaymentError('支付确认失败，请联系客服');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>支付信息</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">咨询费用</span>
              <span className="font-medium">¥{amount.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">服务费</span>
              <span className="font-medium">¥0</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>总计</span>
              <span className="text-primary">¥{amount.toFixed(0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>支付方式</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAirwallexLoaded || !paymentIntent ? (
            <div className="flex items-center justify-center py-12 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-neutral-600">正在初始化支付系统...</p>
                <p className="text-sm text-neutral-500 mt-2">正在创建客户信息和支付凭证</p>
              </div>
            </div>
          ) : (
            <>
              {/* Airwallex Drop-in Element Container */}
              <div 
                id="airwallex-dropin-element" 
                className="min-h-[300px] rounded-lg"
                style={{ minHeight: '300px' }}
              >
                {/* Airwallex drop-in element will be mounted here */}
              </div>
              
              {/* Development info */}
              {import.meta.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">开发模式</p>
                      <p className="text-sm text-blue-700">
                        这是演示环境。Airwallex 支付系统已初始化。
                        在生产环境中将连接真实的支付网关。
                      </p>
                      <div className="mt-2 text-xs text-blue-600">
                        <p>客户ID: {customer?.id}</p>
                        <p>支付凭证: {paymentIntent?.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Security Info */}
          <div className="mt-4 flex items-center space-x-2 text-sm text-neutral-600">
            <Shield className="h-4 w-4" />
            <span>您的支付信息通过 Airwallex 和 SSL 加密保护</span>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-neutral-600 leading-relaxed">
              我已阅读并同意{' '}
              <a href="#" className="text-primary hover:underline">服务条款</a>
              {' '}和{' '}
              <a href="#" className="text-primary hover:underline">隐私政策</a>
              。我了解咨询费用一旦支付，除非咨询师取消预约，否则不予退款。
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {paymentError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{paymentError}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={!acceptedTerms || !isAirwallexLoaded || !paymentIntent || isLoading || isProcessing}
        className="w-full py-3 text-lg"
        size="lg"
      >
        {isLoading || isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>{isProcessing ? '处理支付中...' : '初始化中...'}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>确认支付 ¥{amount.toFixed(0)}</span>
          </div>
        )}
      </Button>

      {/* Payment Methods Info */}
      <div className="text-center text-sm text-neutral-600">
        支持信用卡、微信支付、支付宝等多种支付方式
      </div>
    </div>
  );
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    Airwallex: any;
  }
}
