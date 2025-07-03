import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, AlertTriangle, CreditCard, RefreshCw } from 'lucide-react';
import Navigation from '@/components/navigation';

export default function BookingFailure() {
  const [, setLocation] = useLocation();

  const commonIssues = [
    {
      title: '银行卡信息错误',
      description: '请检查卡号、有效期、CVV码是否正确输入'
    },
    {
      title: '余额不足',
      description: '请确保您的银行卡有足够的余额完成支付'
    },
    {
      title: '银行限制',
      description: '您的银行可能限制了在线支付，请联系银行开通'
    },
    {
      title: '网络问题',
      description: '网络连接不稳定可能导致支付失败，请重试'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Failure Header */}
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardContent className="py-8">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-red-800 mb-2">预约失败</h1>
              <p className="text-red-700">
                很抱歉，您的支付没有成功完成，预约未能确认。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>可能的原因</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {commonIssues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-neutral-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-neutral-800">{issue.title}</p>
                    <p className="text-sm text-neutral-600">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>下一步操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center mt-1">1</div>
              <div>
                <p className="font-medium">检查支付信息</p>
                <p className="text-sm text-neutral-600">
                  确保银行卡信息正确，余额充足，并已开通在线支付功能。
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center mt-1">2</div>
              <div>
                <p className="font-medium">重新尝试预约</p>
                <p className="text-sm text-neutral-600">
                  您可以返回重新选择时间和支付方式完成预约。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center mt-1">3</div>
              <div>
                <p className="font-medium">联系客服</p>
                <p className="text-sm text-neutral-600">
                  如果问题持续存在，请联系我们的客服团队获得帮助。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>需要帮助？</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">在线客服</h4>
                <p className="text-sm text-blue-700 mb-3">
                  工作时间：周一至周日 9:00-21:00
                </p>
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-600">
                  开始对话
                </Button>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">客服热线</h4>
                <p className="text-sm text-green-700 mb-3">
                  400-xxx-xxxx（免费拨打）
                </p>
                <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                  立即拨打
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => setLocation('/booking')} 
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>重新预约</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/therapists')} 
            variant="outline"
          >
            选择其他咨询师
          </Button>
          
          <Button 
            onClick={() => setLocation('/')} 
            variant="outline"
          >
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}