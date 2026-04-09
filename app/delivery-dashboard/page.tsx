"use client";
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce-in
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      <span className="text-xl">{type === 'success' ? '✓' : '✗'}</span>
      <p className="font-bold">{message}</p>
    </div>
  );
};

export default function DeliveryDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Active Job Map
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/api/orders");
      if (res.ok) setOrders(await res.json());
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeJob = orders.find(o => o.status === 'DELIVERING');

  useEffect(() => {
    if (!activeJob || !mapContainer.current) return;
    
    // Hardcoded dev token identical to the ones utilized across app
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    const vLat = activeJob.vLat || 12.9716;
    const vLng = activeJob.vLng || 77.5946;
    const cLat = activeJob.cLat || 12.9716;
    const cLng = activeJob.cLng || 77.5946;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [vLng, vLat],
      zoom: 14
    });

    mapRef.current.fitBounds([ 
      [Math.min(vLng, cLng) - 0.01, Math.min(vLat, cLat) - 0.01], 
      [Math.max(vLng, cLng) + 0.01, Math.max(vLat, cLat) + 0.01] 
    ], { padding: 50 });

    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([vLng, vLat])
      .addTo(mapRef.current);

    new mapboxgl.Marker({ color: '#22c55e' })
      .setLngLat([cLng, cLat])
      .addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeJob]);

  const handleLogout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
     if (!confirm("Are you incredibly sure you wish to wipe this account forever?")) return;
     try {
       await apiFetch("/api/auth/profile", { method: "DELETE" });
       await apiFetch("/api/auth/logout", { method: "POST" });
       router.push("/login");
     } catch(e) {}
  };

  const executeAction = async (orderId: string, newStatus: string) => {
    try {
      const res = await apiFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus })
      });
      if (res.ok) {
        setToast({ message: "Job Status Updated!", type: 'success' });
        fetchOrders();
      } else {
        const data = await res.json();
        setToast({ message: data.error || "Failed to update", type: 'error' });
      }
    } catch (err) {
      setToast({ message: "Error updating order.", type: 'error' });
    }
  };

  const poolOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative overflow-x-hidden pt-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-xl">D</div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Delivery Dashboard</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={handleDeleteAccount} className="text-red-500 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-all bg-red-50 hover:bg-red-600 border border-red-100">
               Delete Account
             </button>
             <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 px-5 py-2.5 rounded-xl font-bold transition-all bg-gray-50 hover:bg-red-50 border border-gray-200">
               Logout
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Active Job Tracker */}
        {activeJob && (
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl border-4 border-blue-500 relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <h2 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
               📍 Active Delivery
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                   <p className="text-sm font-bold tracking-widest text-gray-400 uppercase mb-2">Order Details</p>
                   <h3 className="text-xl font-black text-gray-900 mb-1">{activeJob.item}</h3>
                   <p className="text-gray-500 font-medium">Payout Rate: <span className="text-green-600 font-bold">₹{(activeJob.price * 0.15).toFixed(2)}</span></p>
                </div>

                <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  <div className="relative">
                    <span className="absolute left-[-29px] top-1 w-4 h-4 bg-red-500 rounded-full border-4 border-white shadow-sm"></span>
                    <p className="text-sm font-bold tracking-widest text-gray-400 uppercase">Pickup Location</p>
                    <p className="text-lg font-bold text-gray-900">Vendor Coordinates ({activeJob.vLat?.toFixed(4)}, {activeJob.vLng?.toFixed(4)})</p>
                  </div>
                  <div className="relative">
                    <span className="absolute left-[-29px] top-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm"></span>
                    <p className="text-sm font-bold tracking-widest text-gray-400 uppercase">Dropoff Location</p>
                    <p className="text-lg font-bold text-gray-900">{activeJob.customerName || "Customer"} ({activeJob.cLat?.toFixed(4)}, {activeJob.cLng?.toFixed(4)})</p>
                  </div>
                </div>

                <button 
                  onClick={() => executeAction(activeJob.id, "FINISHED")}
                  className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-black text-xl shadow-xl hover:scale-[1.02] hover:shadow-2xl transition-all"
                >
                  Mark as Delivered ✓
                </button>
              </div>

              <div className="relative h-[400px] bg-gray-100 rounded-[2rem] overflow-hidden border-2 border-gray-200 shadow-inner">
                <div ref={mapContainer} className="w-full h-full" />
              </div>
            </div>
          </div>
        )}

        {/* Job Pool */}
        {!activeJob && (
          <div>
             <div className="flex justify-between items-end mb-6">
               <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-1">Open Job Pool</h2>
                  <p className="text-gray-500 font-medium tracking-wide">Jobs ready for immediate pickup (Total: {poolOrders.length})</p>
               </div>
             </div>

             {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
                </div>
             ) : poolOrders.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                   {poolOrders.map(o => (
                      <div key={o.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all group relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                               Earn ₹{(Math.max(20, o.price * 0.15)).toFixed(0)}
                            </span>
                         </div>
                         <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">ID: {o.id.split('-')[0]}</p>
                         <h3 className="text-xl font-black text-gray-900 mb-1 leading-tight">{o.item}</h3>
                         <div className="my-5 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                               <span className="w-2 h-2 rounded-full bg-red-500"></span> Prepped by Vendor
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                               <span className="w-2 h-2 rounded-full bg-green-500"></span> Going to {o.customerName || "Customer"}
                            </div>
                         </div>
                         <button 
                           onClick={() => executeAction(o.id, "DELIVERING")}
                           className="w-full py-3.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl font-bold transition-colors border border-blue-100 group-hover:border-blue-600"
                         >
                           Accept Delivery
                         </button>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-gray-200">
                  <div className="w-24 h-24 bg-blue-50 text-blue-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">🛵</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">No Open Jobs</h3>
                  <p className="text-gray-500 text-lg">
                    Check back shortly. Vendors are preparing meals.
                  </p>
                </div>
             )}
          </div>
        )}

      </div>

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounceIn { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}} />
    </div>
  );
}

