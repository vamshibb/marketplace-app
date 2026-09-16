import { Link, useNavigate } from "react-router-dom";

import { LoginForm } from "../components/LoginForm";

export const LoginPage = () => {
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
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        
      </div>

      <LoginForm onSuccess={() => navigate("/")} />

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link className="font-medium text-blue-600" to="/register">
          Register
        </Link>
      </p>
    </div>
  );
};
