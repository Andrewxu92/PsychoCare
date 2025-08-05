import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PaymentFormProps {
  amount: number;
  currency?: string;
  appointmentData?: any;
  onSuccess: (intentId: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  isRetryPayment?: boolean;
}

declare global {
  interface Window {
    AirwallexComponentsSDK: any;
  }
}

export default function PaymentForm({
  amount,
  currency = "HKD",
  appointmentData,
  onSuccess,
  onError,
  disabled = false,
  isRetryPayment = false,
}: PaymentFormProps) {
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const dropInRef = useRef<any>(null);

  // Initialize payment system step by step
  useEffect(() => {
    initializePayment();
  }, []);

  // Create drop-in element when payment intent is ready and DOM is mounted
  useEffect(() => {
    if (paymentIntent && !dropInRef.current) {
      createDropIn();
    }
  }, [paymentIntent]);

  const initializePayment = async () => {
    try {
      console.log("Starting payment initialization...");

      // Load Airwallex SDK
      await loadAirwallexSDK();

      // Get config
      const configRes = await apiRequest("GET", "/api/airwallex/config");
      const config = await configRes.json();

      // Initialize SDK
      await window.AirwallexComponentsSDK.init({
        env: config.environment,
        origin: window.location.origin,
        enabledElements: ["payments"],
      });

      // Create customer
      const customerRes = await apiRequest(
        "POST",
        "/api/payments/customer",
        {},
      );
      const customer = await customerRes.json();

      // Create payment intent
      const intentRes = await apiRequest("POST", "/api/payments/intent", {
        amount: amount,
        currency: currency,
        customer_id: customer.id,
      });
      const intent = await intentRes.json();

      console.log("Payment intent created:", intent.id);
      setPaymentIntent(intent);
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      setPaymentError(`支付初始化失败: ${error.message || "请重试"}`);
    }
  };

  const loadAirwallexSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.AirwallexComponentsSDK) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://static.airwallex.com/components/sdk/v1/index.js";
      script.async = true;
      script.onload = () => {
        setTimeout(() => {
          if (window.AirwallexComponentsSDK) {
            resolve();
          } else {
            reject(new Error("Airwallex SDK not initialized"));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error("Failed to load Airwallex SDK"));
      document.head.appendChild(script);
    });
  };

  const createDropIn = async () => {
    try {
      console.log("Creating drop-in element...");

      // Ensure container exists
      const container = document.getElementById("airwallex-drop-in");
      if (!container) {
        console.error("Container not found, retrying...");
        setTimeout(createDropIn, 100);
        return;
      }

      // Create element
      const element = await window.AirwallexComponentsSDK.createElement(
        "dropIn",
        {
          intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          currency: paymentIntent.currency,
        },
      );

      // Mount element
      await element.mount("airwallex-drop-in");
      dropInRef.current = element;

      // Add event listeners
      element.on("ready", () => {
        console.log("Drop-in element ready");
        setIsReady(true);
      });

      element.on("success", async (event: any) => {
        console.log("Payment succeeded:", event.detail);
        setIsProcessing(true);
        
        try {
          // Extract payment intent ID from the event
          const paymentIntentId = event.detail?.intent?.payment_intent_id || 
                                 event.detail?.intent?.id ||
                                 paymentIntent.id;
          
          // Verify payment status with backend before proceeding
          const response = await apiRequest("GET", `/api/payments/intent/${paymentIntentId}/status`);
          const statusResponse = await response.json();
          
          console.log("Full status response:", statusResponse);
          
          if (statusResponse.status === 'SUCCEEDED') {
            console.log("Payment status verified as SUCCEEDED");
            onSuccess(paymentIntentId);
          } else {
            console.error("Payment not successful, status:", statusResponse.status);
            setPaymentError(`支付未成功，状态: ${statusResponse.status}`);
            setIsProcessing(false);
            onError(`支付未成功，状态: ${statusResponse.status}`);
          }
        } catch (error: any) {
          console.error("Error verifying payment status:", error);
          setPaymentError("支付状态验证失败，请联系客服");
          setIsProcessing(false);
          onError("支付状态验证失败，请联系客服");
        }
      });

      element.on("error", (event: any) => {
        console.error("Payment error:", event.detail);
        setPaymentError(event.detail.error?.message || "Payment failed");
        setIsProcessing(false);
        onError(event.detail.error?.message || "Payment failed");
      });
    } catch (error: any) {
      console.error("Failed to create drop-in:", error);
      setPaymentError(`支付组件创建失败: ${error.message || "未知错误"}`);
    }
  };

  const handlePayment = async () => {
    if (!acceptedTerms) {
      setPaymentError("请先同意服务条款和隐私政策");
      return;
    }
    setIsProcessing(true);
    setPaymentError("");
  };

  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p>正在处理您的预约...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>支付信息</CardTitle>
        <CardDescription>安全支付 - 由 Airwallex 提供支付服务</CardDescription>
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
            <span className="text-2xl font-bold text-primary">
              HK${amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Airwallex Drop-in Container */}
        {!paymentIntent ? (
          <div className="flex items-center justify-center py-12 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-neutral-600">正在加载支付组件...</p>
            </div>
          </div>
        ) : (
          <div
            id="airwallex-drop-in"
            className="mb-6 min-h-[400px] border border-gray-200 rounded-lg"
            style={{ minHeight: "400px" }}
          />
        )}

        {/* Terms and Conditions */}
        <div className="mb-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) =>
                setAcceptedTerms(checked as boolean)
              }
            />
            <label
              htmlFor="terms"
              className="text-sm text-neutral-700 leading-relaxed"
            >
              我已阅读并同意{" "}
              <a href="#" className="text-primary hover:underline">
                服务条款
              </a>{" "}
              和{" "}
              <a href="#" className="text-primary hover:underline">
                隐私政策
              </a>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
