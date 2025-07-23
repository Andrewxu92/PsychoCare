import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createElement, init, ElementTypes } from "@airwallex/components-sdk";

declare global {
  interface Window {
    AirwallexComponentsSDK: any;
  }
}

interface AirwallexBeneficiaryFormProps {
  onSuccess: (beneficiaryData: any) => void;
  onClose: () => void;
}

export default function AirwallexBeneficiaryForm({
  onSuccess,
  onClose,
}: AirwallexBeneficiaryFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<any>(null);
  const mountedRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;

    const initializeAirwallex = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load Airwallex SDK script if not already loaded
        if (!window.AirwallexComponentsSDK) {
          const script = document.createElement("script");
          script.src =
            "https://static.airwallex.com/components/sdk/v1/index.js";
          script.async = true;
          document.head.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error("Failed to load Airwallex SDK"));
          });
        }

        if (!isMounted) return;

        // Get authentication config from server
        const response = await apiRequest("POST", "/api/airwallex/auth");
        const authResponse = await response.json();

        if (
          !authResponse.authCode ||
          !authResponse.clientId ||
          !authResponse.codeVerifier
        ) {
          throw new Error("Failed to get authentication config");
        }

        console.log("Airwallex auth response:", {
          hasAuthCode: !!authResponse.authCode,
          hasClientId: !!authResponse.clientId,
          hasCodeVerifier: !!authResponse.codeVerifier,
          environment: authResponse.environment,
        });

        if (!isMounted) return;

        // Wait for SDK to be available
        let retries = 0;
        while (!window.AirwallexComponentsSDK && retries < 30) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          retries++;
        }

        if (!window.AirwallexComponentsSDK) {
          throw new Error("Airwallex SDK failed to load");
        }

        if (!isMounted) return;

        const { init, createElement } = window.AirwallexComponentsSDK;

        // Initialize Airwallex SDK
        await init({
          locale: "zh",
          env: authResponse.environment === "prod" ? "prod" : "demo",
          authCode: authResponse.authCode,
          clientId: authResponse.clientId,
          codeVerifier: authResponse.codeVerifier,
        });

        if (!isMounted) return;

        // Create beneficiary form element
        const element = await createElement("beneficiaryForm", {
          customizations: {
            minHeight: 500,
          },
        });

        if (!isMounted) return;

        // Create a unique container for mounting
        if (containerRef.current && !mountedRef.current) {
          // Clear any existing content
          containerRef.current.innerHTML = "";

          // Create a new div for mounting
          const mountDiv = document.createElement("div");
          mountDiv.id = `airwallex-beneficiary-${Date.now()}`;
          containerRef.current.appendChild(mountDiv);

          // Mount the element
          element.mount(`#${mountDiv.id}`);
          elementRef.current = element;
          mountedRef.current = true;

          // Set up event handlers
          element.on("submit", (beneficiaryData: any) => {
            console.log("Beneficiary form submitted:", beneficiaryData);
            onSuccess(beneficiaryData);
          });

          element.on("error", (error: any) => {
            console.error("Airwallex beneficiary form error:", error);
            setError(error.message || "An error occurred with the form");
          });

          // Setup cleanup function
          cleanup = () => {
            try {
              if (
                elementRef.current &&
                typeof elementRef.current.unmount === "function"
              ) {
                elementRef.current.unmount();
              }
            } catch (err) {
              console.warn("Error unmounting Airwallex element:", err);
            }

            if (containerRef.current) {
              containerRef.current.innerHTML = "";
            }

            elementRef.current = null;
            mountedRef.current = false;
          };

          if (isMounted) {
            setIsLoading(false);
            toast({
              title: "表单加载成功",
              description: "请填写您的收款账户信息",
            });
          }
        }
      } catch (err) {
        console.error("Error initializing Airwallex:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize Airwallex",
          );
          setIsLoading(false);
          toast({
            title: "初始化失败",
            description: err instanceof Error ? err.message : "请稍后重试",
            variant: "destructive",
          });
        }
      }
    };

    initializeAirwallex();

    // Cleanup function
    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Remove dependencies to prevent infinite loop

  const handleRetry = () => {
    setError(null);
    // Force re-mount by clearing the mounted flag
    mountedRef.current = false;
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
    // The useEffect will automatically re-run due to error state change
  };

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">初始化失败</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleRetry} variant="outline">
              重试
            </Button>
            <Button onClick={onClose} variant="secondary">
              关闭
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>添加收款账户</CardTitle>
            <CardDescription>请填写您的银行账户信息以接收付款</CardDescription>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm">
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center h-32 space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-gray-600">正在加载Airwallex表单...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="min-h-[500px] w-full"
          style={{ display: isLoading ? "none" : "block" }}
        />
      </CardContent>
    </Card>
  );
}
