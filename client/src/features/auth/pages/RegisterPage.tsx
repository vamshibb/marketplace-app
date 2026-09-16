import { Link, useNavigate } from "react-router-dom";

import { RegisterForm } from "../components/RegisterForm";

export const RegisterPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-8 text-center">
        <Link className="inline-flex items-center" to="/">
          <img
            src="/brand/marketplace-logo.png"
            alt="MarketPlace"
            className="h-25 w-auto"
          />
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Create an account</h1>
        
      </div>

      <RegisterForm onSuccess={() => navigate("/")} />

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link className="font-medium text-blue-600" to="/login">
          Login
        </Link>
      </p>
    </div>
  );
};
