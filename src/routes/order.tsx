import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "react-hot-toast";

export const Route = createFileRoute("/order")({
  component: OrderPage,
});

function OrderPage() {
  const navigate = useNavigate();
  const user = useQuery(api.users.getMe);
  const placeOrder = useMutation(api.smm.placeOrder);
  
  // State for manual input
  const [serviceId, setServiceId] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We still query services just to show a helpful list if they exist, 
  // but we don't depend on them for the form to work.
  const activeServices = useQuery(api.smm.getServices) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!serviceId || !targetUrl || quantity <= 0) {
      toast.error("Please fill all fields correctly");
      return;
    }

    setIsSubmitting(true);
    try {
      await placeOrder({
        userId: user._id,
        serviceId: serviceId.trim(),
        quantity,
        targetUrl: targetUrl.trim(),
      });
      toast.success("Order placed successfully!");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">New Order (Manual Mode)</h1>
        
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Service ID (from Provider)
              </label>
              <input
                type="text"
                placeholder="Enter Service ID (e.g. 1024)"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-gray-500">Enter the numeric ID of the service from your SMM provider.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Target Link / URL</label>
              <input
                type="url"
                placeholder="https://instagram.com/p/..."
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Quantity</label>
              <input
                type="number"
                placeholder="1000"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors shadow-lg"
            >
              {isSubmitting ? "Processing..." : "Place Order Now"}
            </button>
          </form>
        </div>

        {activeServices.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-gray-300">Quick Reference (Active Services)</h2>
            <div className="grid grid-cols-1 gap-3">
              {activeServices.map((s: any) => (
                <div key={s._id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs text-gray-500">ID: {s.externalId} | Rate: ${s.rate}/1k</div>
                  </div>
                  <button 
                    onClick={() => setServiceId(s.externalId)}
                    className="bg-gray-700 hover:bg-gray-600 text-xs px-3 py-1 rounded"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
