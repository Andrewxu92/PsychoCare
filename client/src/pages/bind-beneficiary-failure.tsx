import { useNavigate, useLocation } from "react-router-dom";

export default function BindBeneficiaryFailure() {
  const navigate = useNavigate();
  const location = useLocation();
  const errorMsg = location.state?.error || "绑定失败，请重试";
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-2xl font-bold mb-4">绑定失败</h1>
      <p className="mb-6 text-red-600">{errorMsg}</p>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={() => navigate("/therapist-wallet")}
      >
        返回钱包
      </button>
    </div>
  );
} 