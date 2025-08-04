import { Link, useLocation } from "wouter";

export default function BindBeneficiaryFailure() {
  const [location] = useLocation();
  // wouter 没有 state 传递，直接显示通用失败文案
  const errorMsg = "绑定失败，请重试";
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-2xl font-bold mb-4">绑定失败</h1>
      <p className="mb-6 text-red-600">{errorMsg}</p>
      <Link href="/therapist-wallet">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          返回钱包
        </button>
      </Link>
    </div>
  );
} 