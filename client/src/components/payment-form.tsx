import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Shield, Lock, AlertCircle } from "lucide-react";

interface PaymentFormProps {
  amount: number;
  onPaymentSuccess: () => void;
  isLoading?: boolean;
}

export default function PaymentForm({ amount, onPaymentSuccess, isLoading = false }: PaymentFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isAirwallexLoaded, setIsAirwallexLoaded] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

  // Load Airwallex SDK
  useEffect(() => {
    // Check if Airwallex is already loaded
    if (window.Airwallex) {
      setIsAirwallexLoaded(true);
      return;
    }

    // Load Airwallex SDK script
    const script = document.createElement('script');
    script.src = 'https://checkout.airwallex.com/assets/bundle.x.js';
    script.async = true;
    script.onload = () => {
      if (window.Airwallex) {
        setIsAirwallexLoaded(true);
        initializeAirwallex();
      }
    };
    script.onerror = () => {
      setPaymentError('支付系统加载失败，请刷新页面重试');
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const initializeAirwallex = () => {
    try {
      // Initialize Airwallex
      window.Airwallex.init({
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'demo',
        origin: window.location.origin,
      });

      // Create payment element
      // Note: In a real implementation, you would need to:
      // 1. Create a payment intent on your backend
      // 2. Get the client_secret from the payment intent
      // 3. Use that client_secret here

      const element = window.Airwallex.createElement('card', {
        // This would be the real payment intent from your backend
        intent: {
          id: 'demo_intent_id',
          client_secret: process.env.VITE_AIRWALLEX_CLIENT_SECRET || 'demo_client_secret'
        }
      });

      // Mount the element
      element.mount('airwallex-card-element');

      // Handle payment events
      element.on('ready', () => {
        console.log('Airwallex payment element is ready');
      });

      element.on('error', (event: any) => {
        setPaymentError(event.error?.message || '支付过程中出现错误');
      });

    } catch (error) {
      console.error('Airwallex initialization error:', error);
      setPaymentError('支付系统初始化失败');
    }
  };

  const handlePayment = async () => {
    if (!acceptedTerms) {
      setPaymentError('请先同意服务条款和隐私政策');
      return;
    }

    if (!isAirwallexLoaded) {
      setPaymentError('支付系统尚未加载完成，请稍候重试');
      return;
    }

    setPaymentError('');

    try {
      // In a real implementation, you would:
      // 1. Confirm the payment with Airwallex
      // 2. Handle the payment result
      // 3. Update your backend with payment status

      const result = await window.Airwallex.confirmPaymentIntent({
        element: window.Airwallex.getElement('card'),
        id: 'demo_intent_id',
        client_secret: process.env.VITE_AIRWALLEX_CLIENT_SECRET || 'demo_client_secret'
      });

      if (result.error) {
        setPaymentError(result.error.message || '支付失败');
      } else {
        // Payment successful
        onPaymentSuccess();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      
      // For demo purposes, simulate successful payment
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          onPaymentSuccess();
        }, 2000);
      } else {
        setPaymentError(error.message || '支付过程中出现错误');
      }
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
          {!isAirwallexLoaded ? (
            <div className="flex items-center justify-center py-12 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-neutral-600">正在加载支付系统...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Airwallex Payment Element Container */}
              <div 
                id="airwallex-card-element" 
                className="min-h-[200px] border border-neutral-300 rounded-lg p-4"
                style={{ minHeight: '200px' }}
              >
                {/* Airwallex card element will be mounted here */}
              </div>
              
              {/* Fallback UI for development/demo */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">开发模式</p>
                      <p className="text-sm text-yellow-700">
                        这是演示环境。在生产环境中，这里会显示真实的 Airwallex 支付表单。
                        点击"确认支付"将模拟成功支付。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Security Info */}
          <div className="mt-4 flex items-center space-x-2 text-sm text-neutral-600">
            <Shield className="h-4 w-4" />
            <span>您的支付信息通过 SSL 加密保护</span>
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
        disabled={!acceptedTerms || !isAirwallexLoaded || isLoading}
        className="w-full py-3 text-lg"
        size="lg"
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>处理中...</span>
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
