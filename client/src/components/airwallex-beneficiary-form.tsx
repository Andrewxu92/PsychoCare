import { useEffect, useRef, useState } from "react";
import { init, createElement, ElementTypes } from "@airwallex/components-sdk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface AirwallexBeneficiaryFormProps {
  onSuccess: (beneficiaryData: any) => void;
  onClose: () => void;
}

export default function AirwallexBeneficiaryForm({ onSuccess, onClose }: AirwallexBeneficiaryFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const beneficiaryFormRef = useRef<ElementTypes["beneficiaryForm"]>();
  const { toast } = useToast();

  useEffect(() => {
    const initAndRenderElement = async () => {
      try {
        setIsLoading(true);
        
        // Get authentication config from server
        const authResponse = await apiRequest('/api/airwallex/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!authResponse.authCode || !authResponse.clientId || !authResponse.codeVerifier) {
          throw new Error('Failed to get authentication config');
        }

        console.log('Airwallex auth response:', {
          hasAuthCode: !!authResponse.authCode,
          hasClientId: !!authResponse.clientId,
          hasCodeVerifier: !!authResponse.codeVerifier,
          environment: authResponse.environment
        });

        // Initialize Airwallex SDK
        await init({
          locale: "en",
          env: authResponse.environment === 'prod' ? 'prod' : 'demo',
          authCode: authResponse.authCode,
          clientId: authResponse.clientId,
          codeVerifier: authResponse.codeVerifier,
        });

        // Create and mount the beneficiary form element
        const element = await createElement("beneficiaryForm", {
          customizations: {
            minHeight: 500
          }
        });
        
        element.mount("#beneficiary-root");
        beneficiaryFormRef.current = element;

        setIsLoading(false);
        toast({
          title: "表单加载成功",
          description: "请填写您的收款账户信息"
        });

      } catch (error) {
        console.error('Error initializing Airwallex:', error);
        setIsLoading(false);
        toast({
          title: "初始化失败",
          description: "无法加载Airwallex表单，请稍后重试",
          variant: "destructive"
        });
      }
    };

    initAndRenderElement();

    return () => {
      // Clean up the element when component unmounts
      if (beneficiaryFormRef.current) {
        try {
          beneficiaryFormRef.current.destroy?.();
        } catch (error) {
          console.warn('Error destroying Airwallex element:', error);
        }
      }
    };
  }, [toast]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      if (beneficiaryFormRef.current) {
        const submitResult = await beneficiaryFormRef.current.submit();
        console.log('Beneficiary submit result:', submitResult);
        
        onSuccess(submitResult);
        toast({
          title: "收款账户添加成功",
          description: "账户信息已通过Airwallex验证"
        });
      } else {
        throw new Error('表单尚未准备就绪');
      }
    } catch (error) {
      console.error('Error submitting beneficiary:', error);
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "请检查输入信息",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          添加收款账户
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            关闭
          </Button>
        </CardTitle>
        <CardDescription>
          使用Airwallex安全地添加您的收款账户信息。支持银行账户、支付宝、微信支付等多种方式。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>正在加载表单...</span>
          </div>
        )}
        
        <div>
          {/* Airwallex beneficiary form container */}
          <div 
            id="beneficiary-root"
            style={{ minHeight: "500px", marginBottom: "20px" }}
            className="border border-gray-200 rounded-lg"
          >
            {isLoading && (
              <div className="flex items-center justify-center h-full text-gray-500">
                表单加载中...
              </div>
            )}
          </div>
          
          {!isLoading && (
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    提交中...
                  </>
                ) : (
                  "提交"
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}