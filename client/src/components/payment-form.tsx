import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Shield, Loader2 } from 'lucide-react';

interface PaymentFormProps {
  amount: number;
  appointmentData?: any;
  onPaymentSuccess: (result?: any) => void;
  isLoading?: boolean;
}

// Extend window interface for Airwallex SDK
declare global {
  interface Window {
    AirwallexComponentsSDK: any;
  }
}

export default function PaymentForm({ amount, appointmentData, onPaymentSuccess, isLoading = false }: PaymentFormProps) {
  const [paymentError, setPaymentError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [customer, setCustomer] = useState<any>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isAirwallexLoaded, setIsAirwallexLoaded] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const dropInRef = useRef<any>(null);

  // Initialize Airwallex payment system
  useEffect(() => {
    initializePaymentSystem();
  }, []);

  const initializePaymentSystem = async () => {
    try {
      setIsInitializing(true);
      console.log('Starting payment initialization...');

      // Step 1: Get Airwallex configuration from backend
      const configRes = await apiRequest('GET', '/api/airwallex/config');
      const config = await configRes.json();
      console.log('Airwallex config loaded:', { environment: config.environment });

      // Step 2: Load Airwallex Components SDK
      await loadAirwallexSDK();

      // Step 3: Initialize Airwallex Components SDK
      console.log('Initializing Airwallex Components SDK...');
      await window.AirwallexComponentsSDK.init({
        env: config.environment, // Use configured environment
        enabledElements: ['payments'],
      });

      // Step 3: Create customer
      console.log('Creating customer...');
      const customerRes = await apiRequest('POST', '/api/payments/customer', {});
      const customerData = await customerRes.json();
      console.log('Customer created:', customerData);
      setCustomer(customerData);

      // Step 4: Create payment intent
      console.log('Creating payment intent...');
      const intentRes = await apiRequest('POST', '/api/payments/intent', {
        amount: amount,
        currency: 'HKD',
        customer_id: customerData.id
      });
      const intentData = await intentRes.json();
      console.log('Payment intent created:', intentData);
      setPaymentIntent(intentData);

      // Step 5: Create drop-in element
      if (intentData.id && !intentData.id.includes('mock')) {
        console.log('Creating Airwallex drop-in element...');
        await createDropInElement(intentData, customerData);
      } else {
        console.log('Using mock payment data - showing demo interface');
        setIsAirwallexLoaded(true);
      }

    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setPaymentError(`支付系统初始化失败: ${error.message || '请重试'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const loadAirwallexSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.AirwallexComponentsSDK) {
        console.log('Airwallex SDK already loaded');
        resolve();
        return;
      }

      console.log('Loading Airwallex Components SDK...');
      const script = document.createElement('script');
      script.src = 'https://static.airwallex.com/components/sdk/v1/index.js';
      script.async = true;
      script.onload = () => {
        console.log('Airwallex SDK loaded successfully');
        // Wait for SDK to be fully initialized
        setTimeout(() => {
          if (window.AirwallexComponentsSDK) {
            resolve();
          } else {
            reject(new Error('Airwallex SDK not properly initialized'));
          }
        }, 100);
      };
      script.onerror = (error) => {
        console.error('Failed to load Airwallex SDK:', error);
        reject(new Error('Failed to load Airwallex SDK'));
      };
      
      document.head.appendChild(script);
    });
  };

  const createDropInElement = async (intent: any, customer: any) => {
    try {
      // Create drop-in element using AirwallexComponentsSDK
      const element = await window.AirwallexComponentsSDK.createElement('dropIn', {
        intent_id: intent.id,
        client_secret: intent.client_secret,
        currency: intent.currency,
        // Optional: customize appearance
        appearance: {
          mode: 'light',
          variables: {
            colorBrand: '#3b82f6',
          },
        },
      });

      // Mount the element
      console.log('Mounting drop-in element...');
      const domElement = element.mount('airwallex-dropin-element');
      dropInRef.current = element;

      // Add event listeners
      element.on('ready', (event: any) => {
        console.log('Airwallex drop-in element is ready', event.detail);
        // The element is ready, so we can show it
        setIsAirwallexLoaded(true);
      });

      element.on('success', (event: any) => {
        console.log('Payment succeeded', event.detail);
        handlePaymentSuccess(event.detail);
      });

      element.on('error', (event: any) => {
        console.error('Payment error', event.detail);
        setPaymentError(event.detail.error?.message || 'Payment failed');
        setIsProcessing(false);
      });

      // Force set as loaded after mounting (as backup)
      setTimeout(() => {
        if (!isAirwallexLoaded) {
          console.log('Force setting element as loaded after timeout');
          setIsAirwallexLoaded(true);
        }
      }, 3000);

    } catch (error: any) {
      console.error('Failed to create drop-in element:', error);
      throw error;
    }
  };

  const handlePayment = async () => {
    if (!acceptedTerms) {
      setPaymentError('请先同意服务条款和隐私政策');
      return;
    }

    if (!paymentIntent) {
      setPaymentError('支付系统尚未准备就绪，请稍候重试');
      return;
    }

    setPaymentError('');
    setIsProcessing(true);

    try {
      // Check if using mock payment system
      if (paymentIntent.id?.includes('mock')) {
        console.log('Processing mock payment...');
        // Simulate payment processing delay
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

      // For real Airwallex payments, the payment will be triggered by the drop-in element
      // and handled by the 'success' event listener
      console.log('Payment will be processed by Airwallex drop-in element');

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentError('支付过程中出现错误，请重试');
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

  if (isInitializing) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>支付信息</CardTitle>
          <CardDescription>
            安全支付 - 由 Airwallex 提供支付服务
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-neutral-600">正在初始化支付系统...</p>
              <p className="text-sm text-neutral-500 mt-2">请稍候，正在连接 Airwallex 服务</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>支付信息</CardTitle>
        <CardDescription>
          安全支付 - 由 Airwallex 提供支付服务
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">支付错误</p>
                <p className="text-sm text-red-700">{paymentError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Amount */}
        <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">支付金额</span>
            <span className="text-2xl font-bold text-primary">¥{(amount / 100).toFixed(2)}</span>
          </div>
        </div>

        {!isAirwallexLoaded ? (
          <div className="flex items-center justify-center py-12 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-neutral-600">正在加载支付组件...</p>
              <p className="text-sm text-neutral-500 mt-2">请稍候，正在初始化 Airwallex 支付界面</p>
            </div>
          </div>
        ) : (
          <>
            {/* Airwallex Drop-in Element Container */}
            <div 
              id="airwallex-dropin-element" 
              className="min-h-[400px] mb-6"
              style={{ minHeight: '400px' }}
            >
              {/* This container will be populated by the Airwallex drop-in element */}
              {/* Mock Payment Interface - only show if using mock data */}
              {paymentIntent?.id?.includes('mock') && (
                <div className="p-6 border border-neutral-200 rounded-lg space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-neutral-900">演示支付界面</h3>
                    <p className="text-sm text-neutral-600">这是演示环境，不会产生实际费用</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        卡号 *
                      </label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        有效期 *
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        CVC *
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        持卡人姓名 *
                      </label>
                      <input
                        type="text"
                        placeholder="请输入持卡人姓名"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <h4 className="text-sm font-medium text-neutral-700">其他支付方式</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="p-3 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50 focus:ring-2 focus:ring-primary">
                        💳 信用卡
                      </button>
                      <button className="p-3 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50 focus:ring-2 focus:ring-primary">
                        📱 支付宝
                      </button>
                      <button className="p-3 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50 focus:ring-2 focus:ring-primary">
                        💚 微信支付
                      </button>
                      <button className="p-3 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50 focus:ring-2 focus:ring-primary">
                        🏦 银行转账
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-blue-800 text-sm">
                      💳 演示模式：请填写支付信息，点击下方"确认支付"按钮完成模拟支付
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="mb-6 flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-neutral-700">
                我已阅读并同意{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  服务条款
                </a>{' '}
                和{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  隐私政策
                </a>
              </label>
            </div>

            {/* Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={!acceptedTerms || isProcessing || isLoading}
              className="w-full py-3 text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在处理支付...
                </>
              ) : (
                `确认支付 ¥${(amount / 100).toFixed(2)}`
              )}
            </Button>

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
  );
}