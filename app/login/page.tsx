"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const handleUserClick = () => {
    router.push("/auth/login?type=CUSTOMER");
  };

  const handleVendorClick = () => {
    router.push("/auth/login?type=VENDOR");
  };

  const handleDeliveryClick = () => {
    router.push("/auth/login?type=DELIVERY");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100 via-red-50 to-white overflow-hidden relative">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-red-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-300 rounded-full mix-blend-multiply filter blur-[130px] opacity-50 animate-blob animation-delay-4000"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md mx-4 sm:mx-0">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl p-8 sm:p-10 transform transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-500 rounded-2xl shadow-lg mb-6 transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <span className="text-3xl">🍲</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Namma <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Connect</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg">
              Choose your role to continue
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            
            {/* User Button */}
            <button
              onClick={handleUserClick}
              onMouseEnter={() => setHoveredButton("user")}
              onMouseLeave={() => setHoveredButton(null)}
              className="group relative w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-orange-500 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-red-50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full transition-colors duration-300 group-hover:bg-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors duration-300">Continue as User</h3>
                  <p className="text-sm text-gray-500">Order from local vendors</p>
                </div>
              </div>
              
              <div className="relative z-10 text-gray-300 group-hover:text-orange-500 transition-colors duration-300 transform group-hover:translate-x-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            {/* Vendor Button */}
            <button
              onClick={handleVendorClick}
              onMouseEnter={() => setHoveredButton("vendor")}
              onMouseLeave={() => setHoveredButton(null)}
              className="group relative w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-red-500 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-orange-50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full transition-colors duration-300 group-hover:bg-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-700 transition-colors duration-300">Continue as Vendor</h3>
                  <p className="text-sm text-gray-500">Manage your business</p>
                </div>
              </div>

              <div className="relative z-10 text-gray-300 group-hover:text-red-500 transition-colors duration-300 transform group-hover:translate-x-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>

            {/* Delivery Button */}
            <button
              onClick={handleDeliveryClick}
              onMouseEnter={() => setHoveredButton("delivery")}
              onMouseLeave={() => setHoveredButton(null)}
              className="group relative w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
              
              <div className="relative z-10 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full transition-colors duration-300 group-hover:bg-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">Continue as Delivery Partner</h3>
                  <p className="text-sm text-gray-500">Deliver local orders</p>
                </div>
              </div>

              <div className="relative z-10 text-gray-300 group-hover:text-blue-500 transition-colors duration-300 transform group-hover:translate-x-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </button>
            
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
              By continuing, you agree to Namma Connect's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
      
      {/* Global CSS for some specific animations if we need pure tailwind keyframes that don't exist by default */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}} />
    </div>
  );
}
