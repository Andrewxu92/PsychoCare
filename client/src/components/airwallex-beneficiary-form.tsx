import { useEffect, useRef, useState } from "react";
import { init, createElement } from "@airwallex/components-sdk";
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    const initializeAirwallex = async () => {
      try {
        setIsLoading(true);
        
        // Get authentication code from server
        const authResponse = await apiRequest('/api/airwallex/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!authResponse.authCode || !authResponse.codeVerifier) {
          throw new Error('Failed to get authentication code');
        }

        // Get Airwallex config
        const configResponse = await apiRequest('/api/airwallex/config');
        
        if (!mounted) return;

        // Initialize Airwallex SDK
        await init({
          locale: 'en',
          env: configResponse.environment === 'prod' ? 'prod' : 'demo',
          enabledElements: ['payouts'],
          authCode: authResponse.authCode,
          clientId: configResponse.clientId,
          codeVerifier: authResponse.codeVerifier,
        });

        if (!mounted) return;

        // Create beneficiary form element
        const beneficiaryElement = createElement('beneficiaryForm', {
          intent: {
            // Pre-fill some default values if needed
            currency: 'USD',
            // You can add more default values here
          },
          // Customization options
          style: {
            base: {
              fontSize: '14px',
              color: '#424770',
              fontFamily: 'system-ui, sans-serif',
            },
            invalid: {
              color: '#dc2626',
            },
          },
          onReady: () => {
            console.log('Beneficiary form ready');
            if (mounted) {
              setIsInitialized(true);
              setIsLoading(false);
            }
          },
          onSuccess: (event: any) => {
            console.log('Beneficiary created successfully:', event);
            if (mounted) {
              setIsSubmitting(false);
              onSuccess(event.beneficiary);
              toast({
                title: "收款账户添加成功",
                description: "账户信息已通过Airwallex验证"
              });
            }
          },
          onError: (event: any) => {
            console.error('Beneficiary form error:', event);
            if (mounted) {
              setIsSubmitting(false);
              toast({
                title: "添加失败",
                description: event.error?.message || "请检查输入信息",
                variant: "destructive"
              });
            }
          },
          onValidationChange: (event: any) => {
            console.log('Validation change:', event);
          }
        });

        if (!mounted) return;

        elementRef.current = beneficiaryElement;

        // Mount the element to the container
        if (containerRef.current) {
          beneficiaryElement.mount(containerRef.current);
        }

      } catch (error) {
        console.error('Error initializing Airwallex:', error);
        if (mounted) {
          setIsLoading(false);
          toast({
            title: "初始化失败",
            description: "无法加载Airwallex表单，请稍后重试",
            variant: "destructive"
          });
        }
      }
    };

    initializeAirwallex();

    return () => {
      mounted = false;
      if (elementRef.current) {
        try {
          elementRef.current.unmount();
        } catch (error) {
          console.warn('Error unmounting Airwallex element:', error);
        }
      }
    };
  }, [toast, onSuccess]);

  const handleSubmit = () => {
    if (elementRef.current && isInitialized) {
      setIsSubmitting(true);
      try {
        elementRef.current.submit();
      } catch (error) {
        console.error('Error submitting form:', error);
        setIsSubmitting(false);
        toast({
          title: "提交失败",
          description: "表单提交时出现错误",
          variant: "destructive"
        });
      }
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
        
        {!isLoading && (
          <>
            {/* Airwallex beneficiary form container */}
            <div 
              ref={containerRef}
              className="min-h-[400px] border border-gray-200 rounded-lg p-4"
              style={{ minHeight: '400px' }}
            />
            
            {isInitialized && (
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
          </>
        )}
      </CardContent>
    </Card>
  );
}