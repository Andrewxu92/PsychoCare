import { useNavigate } from "react-router-dom";

export default function BindBeneficiarySuccess() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-2xl font-bold mb-4">绑定成功</h1>
      <p className="mb-6">您的收款账户已成功绑定！</p>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => navigate("/therapist-wallet")}
      >
        返回钱包
      </button>
    </div>
  );
} 