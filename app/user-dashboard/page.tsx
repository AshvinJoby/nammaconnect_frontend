"use client";
import { apiFetch } from '@/lib/api';

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Vendor {
  id: string;
  name: string;
}

// --- Toast UI Component
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

export default function CustomerDashboard() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Menu State
  const [activeVendor, setActiveVendor] = useState<Vendor | null>(null);
  const [vendorMenu, setVendorMenu] = useState<any[]>([]);

  // Checkout UI State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<{ vendorId: string, item: any } | null>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);

  const [vendorAddresses, setVendorAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vendors.length === 0) return;
    vendors.forEach(async (v: any) => {
      if (!v.lat || !v.lng || vendorAddresses[v.id]) return;
      try {
        const res = await fetch(`https://api.mapbox.com/search/geocode/v6/reverse?longitude=${v.lng}&latitude=${v.lat}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
           setVendorAddresses(prev => ({ ...prev, [v.id]: data.features[0].properties.full_address }));
        }
      } catch(e) {}
    });
  }, [vendors]);

  // Cart State
  const [cartVendorId, setCartVendorId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]); // Array of { id, name, price, quantity }
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isPaymentSelectorOpen, setIsPaymentSelectorOpen] = useState(false);

  // Tracking State
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!trackingOrder || !mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const vLat = trackingOrder.vLat || 12.9716;
    const vLng = trackingOrder.vLng || 77.5946;
    const cLat = trackingOrder.cLat || 12.9716;
    const cLng = trackingOrder.cLng || 77.5946;

    let currentLng = vLng;
    let currentLat = vLat;
    if (trackingOrder.status === 'FINISHED') {
      currentLng = cLng; currentLat = cLat;
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [currentLng, currentLat],
      zoom: 14
    });

    if (vLat !== cLat || vLng !== cLng) {
      mapRef.current.fitBounds([
        [Math.min(vLng, cLng) - 0.01, Math.min(vLat, cLat) - 0.01],
        [Math.max(vLng, cLng) + 0.01, Math.max(vLat, cLat) + 0.01]
      ], { padding: 50 });
    }

    markerRef.current = new mapboxgl.Marker({ color: '#f97316' })
      .setLngLat([currentLng, currentLat])
      .addTo(mapRef.current);

    let animationFrame: number;
    if (trackingOrder.status === 'DELIVERING') {
      let progress = 0;
      const animateMarker = () => {
        progress += 0.002;
        if (progress > 1) progress = 0;

        const lng = vLng + (cLng - vLng) * progress;
        const lat = vLat + (cLat - vLat) * progress;

        markerRef.current?.setLngLat([lng, lat]);
        animationFrame = requestAnimationFrame(animateMarker);
      };
      animateMarker();
    } else if (trackingOrder.status === 'FINISHED') {
      markerRef.current?.setLngLat([cLng, cLat]);
    } else {
      markerRef.current?.setLngLat([vLng, vLat]);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trackingOrder]);

  // Logout Handlers
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [vendorsRes, ordersRes] = await Promise.all([
          apiFetch("/api/vendors"),
          apiFetch("/api/orders"),
        ]);

        if (vendorsRes.ok) setVendors(await vendorsRes.json());
        if (ordersRes.ok) setOrders(await ordersRes.json());
      } catch (err) {
        console.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const initiateCheckout = (vendorId: string, menuItem: any) => {
    setCheckoutItem({ vendorId, item: menuItem });
    setCheckoutQty(1);
  };

  const addToCart = () => {
    if (!checkoutItem) return;
    const { vendorId, item } = checkoutItem;

    if (cartVendorId && cartVendorId !== vendorId) {
      if (!confirm("Adding an item from a different vendor will clear your current cart. Continue?")) return;
      setCartItems([]);
    }

    setCartVendorId(vendorId);

    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + checkoutQty } : i);
      } else {
        return [...prev, { ...item, quantity: checkoutQty }];
      }
    });

    setToast({ message: "Added to cart", type: 'success' });
    setCheckoutItem(null);
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  const submitCart = async (method: 'COD' | 'RAZORPAY') => {
    if (cartItems.length === 0 || !cartVendorId) return;

    if (method === 'COD') {
      try {
        const finalRes = await apiFetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendorId: cartVendorId,
            items: cartItems,
            paymentMethod: 'COD'
          }),
        });

        if (finalRes.ok) {
          const newOrderData = await finalRes.json();
          setOrders((prev: any) => [newOrderData.order, ...prev]);
          setToast({ message: "COD Order Placed Successfully!", type: 'success' });
          setCartItems([]);
          setIsPaymentSelectorOpen(false);
          setIsCartModalOpen(false);
        } else {
          const errData = await finalRes.json();
          setToast({ message: `Checkout failed: ${errData.error}`, type: 'error' });
        }
      } catch (err) {
        setToast({ message: "Network error placing order.", type: 'error' });
      }
      return;
    }

    try {
      const rpRes = await apiFetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: cartVendorId, items: cartItems }),
      });

      if (!rpRes.ok) {
        const errData = await rpRes.json();
        setToast({ message: `Checkout Error: ${errData.error}`, type: 'error' });
        return;
      }

      const orderMetaData = await rpRes.json();

      const options = {
        key: "rzp_test_Sb7pWVm6OSuOCu",
        amount: orderMetaData.amount,
        currency: orderMetaData.currency,
        name: "Namma Connect",
        description: "Payment for Order",
        order_id: orderMetaData.orderId,
        handler: async function (response: any) {
          try {
            const finalRes = await apiFetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vendorId: cartVendorId,
                items: cartItems,
                paymentMethod: 'RAZORPAY',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            if (finalRes.ok) {
              const newOrderData = await finalRes.json();
              setOrders((prev: any) => [newOrderData.order, ...prev]);
              setToast({ message: "Payment Successful & Order Placed!", type: 'success' });
              setCartItems([]);
              setIsPaymentSelectorOpen(false);
              setIsCartModalOpen(false);
            } else {
              const errData = await finalRes.json();
              setToast({ message: `Database persistence failed: ${errData.error}`, type: 'error' });
            }
          } catch (err) {
            setToast({ message: "Network error pushing finalized order.", type: 'error' });
          }
        },
        theme: { color: "#f97316" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setToast({ message: "Payment Failed or Canceled", type: 'error' });
      });
      rzp.open();

    } catch (err) {
      setToast({ message: "Network error placing order.", type: 'error' });
    }
  };

  const handleViewMenu = async (vendor: Vendor) => {
    if (activeVendor?.id === vendor.id) {
      setActiveVendor(null);
      return;
    }
    setActiveVendor(vendor);
    const res = await apiFetch(`/api/menu?vendorId=${vendor.id}`);
    if (res.ok) setVendorMenu(await res.json());
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? It will be automatically fully refunded.")) return;
    try {
      const res = await apiFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus: "DECLINED" })
      });
      if (res.ok) {
        setOrders(prev => prev.map((o: any) => o.id === orderId ? { ...o, status: "DECLINED" } : o));
        setToast({ message: "Order cancelled successfully.", type: "success" });
      } else {
        const errData = await res.json();
        setToast({ message: errData.error || "Failed to cancel order", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Network error cancelling order", type: "error" });
    }
  };

  const filteredVendors = vendors.filter((v: any) => {
    const searchLower = search.toLowerCase();
    const vendorNameMatch = v.name.toLowerCase().includes(searchLower);
    const menuItemMatch = v.menuItems && v.menuItems.some((m: any) => m.name.toLowerCase().includes(searchLower));
    return vendorNameMatch || menuItemMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-gray-50 to-white px-4 sm:px-6 lg:px-8 pb-12 relative overflow-x-hidden">

      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Toast Overlay */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Checkout Modal */}
      {checkoutItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <h2 className="text-2xl font-black mb-1">Add to Cart</h2>
              <p className="font-medium text-white/80">Select quantity</p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{checkoutItem.item.name}</h3>
                <p className="text-gray-500 font-medium">₹{checkoutItem.item.price} per unit</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border-2 border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-700">Quantity</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setCheckoutQty(Math.max(1, checkoutQty - 1))}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100 transition-colors shadow-sm"
                  >-</button>
                  <span className="text-gray-700 text-xl font-black min-w-[2rem] text-center">{checkoutQty}</span>
                  <button
                    onClick={() => setCheckoutQty(checkoutQty + 1)}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-100 transition-colors shadow-sm"
                  >+</button>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-gray-100 pt-6">
                <div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Grand Total</p>
                  <p className="text-4xl font-black text-gray-900">₹{(checkoutItem.item.price * checkoutQty).toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setCheckoutItem(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >Cancel</button>
                <button
                  onClick={addToCart}
                  className="flex-[2] py-4 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:bg-black hover:scale-[1.02] transition-all"
                >Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {isCartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
            <div className="bg-gradient-to-r from-gray-900 to-black p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black mb-1">Your Cart</h2>
                <p className="font-medium text-white/80">{cartItems.reduce((acc, i) => acc + i.quantity, 0)} items</p>
              </div>
              <button onClick={() => setIsCartModalOpen(false)} className="bg-white/20 hover:bg-white text-white hover:text-black w-10 h-10 rounded-full font-bold transition-all">✕</button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {cartItems.length === 0 ? (
                <p className="text-center text-gray-500 py-4 font-bold">Your cart is empty.</p>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{item.name}</h4>
                      <p className="text-sm font-bold text-gray-500">₹{item.price} x {item.quantity}</p>
                    </div>
                    <div className="font-black text-gray-900 mr-4">₹{(item.price * item.quantity).toFixed(2)}</div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Grand Total</p>
                  <p className="text-3xl font-black text-gray-900">₹{cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setIsPaymentSelectorOpen(true)}
                  className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg shadow-xl hover:bg-orange-600 hover:scale-[1.02] transition-all"
                >Proceed to Checkout</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {isPaymentSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black mb-1">Select Payment</h2>
                <p className="font-medium text-white/80">How would you like to pay?</p>
              </div>
              <button onClick={() => setIsPaymentSelectorOpen(false)} className="bg-white/20 hover:bg-white text-white hover:text-black w-10 h-10 rounded-full font-bold transition-all">✕</button>
            </div>
            <div className="p-8 space-y-4">
              <button
                onClick={() => submitCart('RAZORPAY')}
                className="w-full py-4 border-2 border-gray-100 text-gray-900 rounded-xl font-bold hover:border-purple-500 hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <span className="text-xl">💳</span> Pay via Razorpay
              </button>
              <button
                onClick={() => submitCart('COD')}
                className="w-full py-4 border-2 border-gray-100 text-gray-900 rounded-xl font-bold hover:border-orange-500 hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <span className="text-xl">💵</span> Cash on Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black mb-1">Live Order Tracking</h2>
                <p className="font-medium text-white/80 uppercase tracking-widest text-sm">Status: <span className="font-bold text-orange-400">{trackingOrder.status}</span></p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="bg-white/20 hover:bg-white text-white hover:text-black w-10 h-10 rounded-full font-bold transition-all">✕</button>
            </div>

            <div className="p-4 relative">
              <div ref={mapContainer} className="w-full h-[400px] rounded-2xl overflow-hidden border-2 border-gray-100" />
              <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-gray-100 space-y-2 pointer-events-none">
                <div className="flex justify-between tracking-wide gap-8"><span className="text-xs font-bold text-gray-500">VENDOR</span><span className="text-xs font-black text-gray-900">{trackingOrder.vLat?.toFixed(4)}, {trackingOrder.vLng?.toFixed(4)}</span></div>
                <div className="flex justify-between tracking-wide gap-8"><span className="text-xs font-bold text-gray-500">DESTINATION</span><span className="text-xs font-black text-gray-900">{trackingOrder.cLat?.toFixed(4)}, {trackingOrder.cLng?.toFixed(4)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-bounce-in">
          <button
            onClick={() => setIsCartModalOpen(true)}
            className="flex items-center gap-4 bg-gray-900 text-white px-8 py-4 rounded-full shadow-2xl hover:scale-105 hover:bg-black transition-all border border-gray-700"
          >
            <div className="bg-orange-500 w-8 h-8 rounded-full flex items-center justify-center font-black">
              {cartItems.reduce((sum, i) => sum + i.quantity, 0)}
            </div>
            <span className="font-bold text-lg tracking-wide">View Cart</span>
            <span className="font-black text-orange-400">₹{cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Abstract Shapes */}
      <div className="absolute top-0 left-[-10%] w-[500px] h-[500px] bg-orange-200 rounded-full mix-blend-multiply filter blur-[150px] opacity-40 pointer-events-none"></div>

      {/* Navigation */}
      <div className="relative z-10 flex justify-between items-center py-6 mb-8 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img src="/namma_connect.jpeg" alt="Namma Connect" className="w-12 h-12 rounded-xl shadow-md object-cover" />
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Namma <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Connect</span></h1>
        </div>

        <div className="flex gap-3">
           <button onClick={handleDeleteAccount} className="px-5 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl shadow-sm hover:bg-red-600 hover:text-white transition-all duration-200">
             Delete Account
           </button>
           <button onClick={handleLogout} className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:text-red-600 transition-all duration-200">
             Logout
           </button>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        {/* Search Header */}
        <div className="space-y-6">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">What are you craving?</h2>
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search local vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 bg-white shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none text-lg font-medium text-gray-900"
            />
          </div>
        </div>

        {/* Vendors Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Nearby Vendors</h3>
            <span className="bg-orange-100 text-orange-700 py-1.5 px-4 rounded-full text-sm font-bold shadow-sm">{vendors.length} Active</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
            </div>
          ) : filteredVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVendors.map((v) => (
                <div key={v.id} className={`group bg-white rounded-[2rem] p-6 border-2 transition-all duration-300 ${activeVendor?.id === v.id ? 'border-orange-500 shadow-xl' : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-orange-200'}`}>
                  <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-red-50 text-orange-600 group-hover:scale-110 transition-transform duration-300 shadow-inner overflow-hidden">
                    {v.imageUrl ? <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" /> : <span className="text-2xl font-black">{v.name.charAt(0).toUpperCase()}</span>}
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">{v.name}</h3>
                  {v.lat && v.lng && (
                    <div className="mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-start gap-2">
                      <span className="text-sm">📍</span>
                      <p className="text-xs font-bold text-gray-500 leading-tight">
                         {vendorAddresses[v.id] ? vendorAddresses[v.id] : `Coordinates: ${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-green-600 font-bold mb-6 bg-green-50 w-max px-3 py-1 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    Accepting Orders
                  </div>
                  <div>
                    <button
                      onClick={() => handleViewMenu(v)}
                      className={`w-full py-3 font-bold rounded-xl transition-colors duration-200 
                        ${activeVendor?.id === v.id ? 'bg-gray-900 text-white hover:bg-black' : 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white'}`}
                    >
                      {activeVendor?.id === v.id ? 'Close Menu' : 'View Menu'}
                    </button>
                  </div>

                  {/* Menu Accordion */}
                  {activeVendor?.id === v.id && (
                    <div className="mt-5 pt-5 border-t-2 border-gray-50 space-y-3 animate-fade-in">
                      <h4 className="font-bold text-gray-400 text-sm tracking-widest uppercase mb-4">Available Items</h4>
                      {vendorMenu.filter((m: any) => m.isAvailable).length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-xl">
                          <p className="text-sm font-bold text-gray-400">No items available right now.</p>
                        </div>
                      ) : (
                        vendorMenu.filter((m: any) => m.isAvailable).map((m: any) => (
                          <div key={m.id} className="flex justify-between items-center p-3 rounded-2xl transition-all border-2 bg-white hover:border-orange-500 border-gray-100 hover:shadow-md">
                            <div className="flex items-center gap-3">
                              {m.imageUrl && (
                                <img src={m.imageUrl} alt={m.name} className="w-12 h-12 rounded-lg object-cover shadow-sm border border-gray-100" />
                              )}
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{m.name}</p>
                                <p className="text-sm font-black text-orange-600">₹{m.price}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => initiateCheckout(v.id, m)}
                              className="bg-gray-900 hover:bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
                            >
                              Add
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-gray-100 border-dashed">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl opacity-50">🔍</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">No vendors found</h3>
              <p className="text-gray-500 font-medium">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="pt-10 border-t-2 border-gray-100">
          <h3 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Your Recent Orders</h3>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((o: any) => (
                <div key={o.id} className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${o.status === 'DECLINED' ? 'border-gray-200 opacity-60 grayscale-[50%]' : 'border-gray-100 hover:border-gray-300'}`}>
                  <div>
                    <div className="flex gap-2 items-center mb-2">
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 rounded-lg py-1 uppercase tracking-widest">ID: {o.id.split('-')[0]}</span>
                      <span className="text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2 rounded-lg py-1">{new Date(o.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <h4 className="font-black text-gray-900 text-xl mb-1">{o.quantity > 1 ? `${o.quantity}x ` : ''}{o.item}</h4>
                    <p className="font-bold text-gray-500">Order Total: <span className="text-green-600 ml-1">₹{o.price || "---"}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider border-2
                      ${o.status === 'PENDING' ? 'bg-red-50 text-red-700 border-red-200' :
                        o.status === 'PREPARING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          o.status === 'DELIVERING' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            o.status === 'DECLINED' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                              'bg-green-50 text-green-700 border-green-200'}`}>
                      {o.status}
                    </span>
                    <button
                      onClick={() => setTrackingOrder(o)}
                      className="inline-flex items-center px-4 py-2.5 bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                    >
                      📍 Track
                    </button>
                    {o.status === "PENDING" && (
                      <button
                        onClick={() => cancelOrder(o.id)}
                        className="inline-flex items-center px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-sm font-bold transition-colors shadow-sm"
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[2rem] border-2 border-gray-100 text-center shadow-sm">
              <span className="text-5xl opacity-30 mb-4 inline-block">🛍️</span>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Your cart is empty</h3>
              <p className="text-gray-500 font-medium">You haven't placed any orders yet. Find a vendor above!</p>
            </div>
          )}
        </div>

      </div>

      {/* Global Animations Custom Styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bounceIn { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-bounce-in { animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}} />
    </div>
  );
}
