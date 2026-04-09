"use client";
import { apiFetch } from '@/lib/api';

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginType = searchParams.get("type") || "CUSTOMER";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, loginType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to login");
      }

      // Route based on role
      if (loginType === "VENDOR") {
        router.push("/vendor-dashboard");
      } else if (loginType === "DELIVERY") {
        router.push("/delivery-dashboard");
      } else {
        router.push("/user-dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isVendor = loginType === "VENDOR";
  const isDelivery = loginType === "DELIVERY";

  return (
    <div className="relative z-10 w-full max-w-md mx-4 sm:mx-0">
      <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl p-8 sm:p-10">
        <div className="text-center mb-8">
          <img src="/namma_connect.jpeg" alt="Namma Connect Logo" className="w-20 h-20 rounded-3xl shadow-xl mb-4 object-cover mx-auto" />
          <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome Back</h2>
          <p className="text-sm text-gray-500 font-medium">Log in to your {isVendor ? "Vendor" : isDelivery ? "Delivery" : "Customer"} account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-gray-50/50"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200 transition-all outline-none bg-gray-50/50"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${isVendor ? "bg-red-500 hover:bg-red-600 shadow-red-500/30" : isDelivery ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/30"}`}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-medium text-gray-500">
          Don't have an account?{" "}
          <Link href={`/auth/register?type=${loginType}`} className="text-orange-600 hover:text-orange-700 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-red-50 to-white relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-60"></div>
      
      <Suspense fallback={<div className="text-orange-500 font-bold">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

