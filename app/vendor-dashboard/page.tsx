"use client";
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const STATUS_FLOW = ["PENDING", "PREPARING", "READY", "DELIVERING", "FINISHED"];

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

export default function VendorDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // New Item State
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState<File | null>(null);

  // Settings State
  const [vendorLogo, setVendorLogo] = useState<File | null>(null);
  const [editLat, setEditLat] = useState<number>(12.9716);
  const [editLng, setEditLng] = useState<number>(77.5946);
  const mapSettingsContainer = useRef<HTMLDivElement | null>(null);
  const mapSettingsRef = useRef<mapboxgl.Map | null>(null);
  const markerSettingsRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!isSettingsOpen || !mapSettingsContainer.current) return;
    if (mapSettingsRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    mapSettingsRef.current = new mapboxgl.Map({
      container: mapSettingsContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [editLng, editLat],
      zoom: 12
    });

    markerSettingsRef.current = new mapboxgl.Marker({ color: '#f97316' })
      .setLngLat([editLng, editLat])
      .addTo(mapSettingsRef.current);

    mapSettingsRef.current.on('click', (e) => {
      setEditLng(e.lngLat.lng);
      setEditLat(e.lngLat.lat);
      markerSettingsRef.current?.setLngLat([e.lngLat.lng, e.lngLat.lat]);
    });

    return () => {
      if (mapSettingsRef.current) {
        mapSettingsRef.current.remove();
        mapSettingsRef.current = null;
      }
    };
  }, [isSettingsOpen]);

  const saveSettings = async () => {
    let finalImageUrl = undefined;
    if (vendorLogo) {
      const formData = new FormData();
      formData.append('file', vendorLogo);
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        finalImageUrl = (await res.json()).url;
      } else {
        setToast({ message: "Failed to upload logo", type: 'error' });
        return;
      }
    }

    const res = await apiFetch('/api/auth/profile', {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: editLat, lng: editLng, imageUrl: finalImageUrl })
    });

    if (res.ok) {
      setToast({ message: "Store Profile Updated!", type: "success" });
      setIsSettingsOpen(false);
    } else {
      setToast({ message: "Failed to update profile", type: "error" });
    }
  };

  const fetchOrdersAndMenu = async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        apiFetch("/api/orders"),
        apiFetch("/api/menu"),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (menuRes.ok) setMenuItems(await menuRes.json());
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiFetch("/api/orders");
      if (res.ok) setOrders(await res.json());
    } catch (err) {}
  };

  useEffect(() => {
    fetchOrdersAndMenu();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

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

  const submitNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) {
      setToast({ message: "Please fill out all fields.", type: 'error' });
      return;
    }

    try {
      let finalImageUrl = undefined;
      if (newItemImage) {
        const formData = new FormData();
        formData.append('file', newItemImage);
        const uploadRes = await apiFetch('/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) finalImageUrl = (await uploadRes.json()).url;
      }

      const res = await apiFetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newItemName, 
          price: newItemPrice,
          imageUrl: finalImageUrl
        }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setMenuItems((prev) => [newItem.item, ...prev]);
        setToast({ message: "Item added successfully!", type: 'success' });
        setIsAddingItem(false);
        setNewItemName(""); setNewItemPrice(""); setNewItemImage(null);
      } else {
        setToast({ message: "Failed to add item.", type: 'error' });
      }
    } catch (err) {
      setToast({ message: "Network error adding item.", type: 'error' });
    }
  };

  const toggleAvailable = async (id: string, currentStatus: boolean) => {
    try {
      const res = await apiFetch(`/api/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !currentStatus })
      });
      if (res.ok) {
        setMenuItems(prev => prev.map(m => m.id === id ? { ...m, isAvailable: !currentStatus } : m));
        setToast({ message: "Item status updated", type: "success" });
      } else {
        setToast({ message: "Failed to update item status", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Network error updating item.", type: "error" });
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await apiFetch(`/api/menu/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMenuItems(prev => prev.filter(m => m.id !== id));
        setToast({ message: "Item deleted", type: "success" });
      } else {
        setToast({ message: "Failed to delete item", type: "error" });
      }
    } catch (err) {
      setToast({ message: "Network error deleting item.", type: "error" });
    }
  };

  const updateOrderStatus = async (orderId: string, currentStatus: string, action: 'ADVANCE' | 'DECLINE') => {
    let newStatus = "";
    if (action === 'DECLINE') {
      newStatus = "DECLINED";
    } else {
      const currentIndex = STATUS_FLOW.indexOf(currentStatus);
      if (currentIndex >= STATUS_FLOW.indexOf("READY")) return;
      newStatus = STATUS_FLOW[currentIndex + 1];
    }

    try {
      const res = await apiFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus })
      });
      
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (action === 'DECLINE') {
            setToast({ message: "Order declined. Inventory restored.", type: 'success' });
            // Re-fetch menu items to get updated inventory
            const menuRes = await apiFetch("/api/menu");
            if (menuRes.ok) setMenuItems(await menuRes.json());
        }
      } else {
         setToast({ message: "Failed to update order status.", type: 'error' });
      }
    } catch (err) {
       setToast({ message: "Error updating order.", type: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-red-100 text-red-700 border-red-200";
      case "PREPARING": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "READY": return "bg-orange-100 text-orange-700 border-orange-200";
      case "DELIVERING": return "bg-blue-100 text-blue-700 border-blue-200";
      case "FINISHED": return "bg-green-100 text-green-700 border-green-200";
      case "DECLINED": return "bg-gray-100 text-gray-500 border-gray-200 opacity-60";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getLocalDateString = (dateObj: Date) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const todayStr = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const historicalEarnings: Record<string, number> = {};
  orders.forEach(o => {
    if (o.status !== "FINISHED") return;
    const dateStr = getLocalDateString(new Date(o.createdAt));
    historicalEarnings[dateStr] = (historicalEarnings[dateStr] || 0) + (o.price || 0);
  });

  const sortedDates = Object.keys(historicalEarnings).sort((a,b) => b.localeCompare(a));
  const selectedEarnings = historicalEarnings[selectedDate] || 0;

  const displayOrders = orders.filter(o => {
    const orderDateStr = getLocalDateString(new Date(o.createdAt));
    if (selectedDate === todayStr) {
       return orderDateStr === todayStr && o.status !== "FINISHED" && o.status !== "DECLINED";
    } else {
       return orderDateStr === selectedDate;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative overflow-x-hidden">
      {/* Toast Render */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-slide-up">
            <h2 className="text-2xl font-black text-gray-900 mb-6">➕ Add Menu Item</h2>
            <form onSubmit={submitNewItem} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="e.g., Masala Dosa" 
                  value={newItemName} onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Price (₹)</label>
                  <input 
                    type="number"
                    required 
                    min="1"
                    placeholder="e.g., 50" 
                    value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Food Picture (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setNewItemImage(e.target.files?.[0] || null)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddingItem(false)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-bold shadow-md hover:bg-red-600 transition-all">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="bg-red-500 text-white shadow-md relative z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <img src="/namma_connect.jpeg" alt="Namma Connect Logo" className="w-10 h-10 rounded-xl shadow-md object-cover border-2 border-white/20" />
            <h1 className="text-2xl font-black tracking-tight">Vendor Dashboard</h1>
          </div>
          <div className="flex gap-3">
             <button
               onClick={handleDeleteAccount}
               className="bg-white/20 hover:bg-white text-white hover:text-red-800 px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all duration-200"
             >
               Delete Account
             </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white/20 hover:bg-white text-white hover:text-red-600 px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all duration-200"
            >
              ⚙ Profile
            </button>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white text-white hover:text-red-600 px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-black text-gray-900">⚙ Store Profile</h2>
               <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-bold text-gray-600 hover:bg-gray-200">✕</button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Upload New Store Logo</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setVendorLogo(e.target.files?.[0] || null)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-semibold text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Update Store Location Pin</label>
                <div ref={mapSettingsContainer} className="w-full h-[250px] rounded-xl overflow-hidden shadow-inner border border-gray-200" />
                <p className="text-xs text-gray-500 mt-2 text-center">Tap the map to set your updated cart/store location</p>
              </div>

              <button onClick={saveSettings} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold shadow-xl hover:bg-black hover:scale-[1.02] transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        {/* Earnings Card */}
        <div className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-[2rem] shadow-xl text-white relative overflow-hidden transition-all duration-300">
          <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-red-500/20 rounded-full blur-[80px]"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-300 flex items-center gap-2 hover:text-white transition-colors">
                 {selectedDate === todayStr ? "Today's Earnings" : `Earnings: ${selectedDate}`} 
                 <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="p-2 ml-1 hover:bg-white/10 rounded-full transition-colors text-sm flex items-center justify-center">
                   {isHistoryExpanded ? '▲' : '▼'}
                 </button>
              </h2>
              <p className="text-6xl font-black mt-2 tracking-tighter">₹{selectedEarnings.toFixed(2)}</p>
            </div>
            {selectedDate !== todayStr && (
               <button onClick={() => setSelectedDate(todayStr)} className="bg-white text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-gray-200 hover:scale-105 shadow-md active:scale-95 transition-all">Today</button>
            )}
          </div>

          {/* Expanded History */}
          {isHistoryExpanded && (
             <div className="mt-8 pt-6 border-t border-white/20 animate-fade-in relative z-10">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Past Records</h3>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {sortedDates.filter(d => d !== todayStr).length === 0 ? (
                      <p className="text-gray-500 font-medium">No past earning records.</p>
                   ) : (
                     sortedDates.filter(d => d !== todayStr).map(dateKey => (
                       <div key={dateKey} onClick={() => { setSelectedDate(dateKey); setIsHistoryExpanded(false); }} className="flex justify-between items-center p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/20 shadow-sm hover:shadow-lg">
                          <span className="font-bold text-lg">{dateKey}</span>
                          <span className="font-black text-green-400 text-xl">₹{historicalEarnings[dateKey].toFixed(2)}</span>
                       </div>
                     ))
                   )}
                </div>
             </div>
          )}
        </div>

        {/* Menu Management */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Digital Menu & Inventory</h2>
            <button onClick={() => setIsAddingItem(true)} className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2 rounded-xl font-bold transition-colors">
              + New Item
            </button>
          </div>
          
          <div className="space-y-3">
            {menuItems.map((item) => (
              <div key={item.id} className="p-4 border border-gray-100 bg-gray-50/50 rounded-2xl flex items-center justify-between group hover:border-red-100 transition-colors">
                <div className="flex items-center gap-4">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg object-cover shadow-sm border border-gray-200" />
                  )}
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">{item.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded text-sm">₹{item.price}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleAvailable(item.id, item.isAvailable)}
                    className={`px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm border transition-colors ${item.isAvailable ? 'bg-white text-green-600 border-green-200 hover:bg-green-50' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                  >
                    {item.isAvailable ? 'Available' : 'Out of Stock'}
                  </button>
                  <button 
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 rounded-xl text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:shadow-sm transition-all"
                    title="Delete Item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {menuItems.length === 0 && !loading && (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                <p className="text-gray-500 font-medium">No items on your menu. Start adding some!</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Orders Queue */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              {selectedDate === todayStr ? 'Live Order Feed' : `Order History: ${selectedDate}`}
              {selectedDate === todayStr && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </h2>
            <span className="px-4 py-1.5 bg-gray-900 text-white font-bold rounded-full text-sm">
              {displayOrders.length} {selectedDate === todayStr ? 'Active' : 'Total'}
            </span>
          </div>

          {loading ? (
             <div className="flex justify-center py-10">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
             </div>
          ) : displayOrders.length > 0 ? (
            <div className="grid gap-5">
              {displayOrders.map((o) => (
                <div key={o.id} className={`bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all ${o.status === 'DECLINED' ? 'opacity-60 grayscale-[50%]' : 'hover:shadow-md'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg uppercase tracking-wider">ID: {o.id.split('-')[0]}</span>
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg">{new Date(o.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">{o.quantity > 1 ? `${o.quantity}x ` : ''}{o.item}</h3>
                    <p className="text-gray-600 font-medium flex items-center gap-2">
                       <span className="bg-gray-100 px-2 py-0.5 rounded text-sm text-gray-700">Client: <b>{o.customerName || "Customer"}</b></span> 
                       <span className="bg-green-50 px-2 py-0.5 rounded text-sm text-green-700">Total: <b>₹{o.price}</b></span>
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-5 py-2.5 font-bold rounded-xl text-sm uppercase tracking-wider border-2 ${getStatusColor(o.status)}`}>
                      {o.status}
                    </span>
                    
                    {o.status === "PENDING" || o.status === "PREPARING" ? (
                      <div className="flex items-center gap-2">
                         {o.status === "PENDING" && (
                            <button 
                              onClick={() => updateOrderStatus(o.id, o.status, 'DECLINE')}
                              className="bg-white border-2 border-red-500 text-red-600 font-bold px-5 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
                            >
                              Decline
                            </button>
                         )}
                         <button 
                           onClick={() => updateOrderStatus(o.id, o.status, 'ADVANCE')}
                           className="bg-black text-white font-bold px-6 py-2.5 rounded-xl shadow-md hover:bg-gray-800 transition-colors flex items-center gap-2"
                         >
                           {o.status === "PENDING" ? "Start Cooking ➔" : "Mark Ready ➔"}
                         </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-16 text-center border-2 border-dashed border-gray-200 shadow-sm">
              <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl opacity-50">📋</span>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">{selectedDate === todayStr ? 'Queue is Empty' : 'No Records Found'}</h3>
              <p className="text-gray-500 text-lg">
                {selectedDate === todayStr 
                  ? "You have no active orders to fulfill at the moment." 
                  : `There are no recorded transactions for ${selectedDate}.`}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Global CSS for animations */}
      <style dangerouslySetInnerHTML={{__html: `
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
