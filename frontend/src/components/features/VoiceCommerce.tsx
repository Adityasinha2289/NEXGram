"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Check, Loader2, Package } from "lucide-react";

type VoiceState =
  "idle" | "listening" | "processing" | "confirming" | "success";

export const VoiceCommerce = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  const startListening = () => {
    setVoiceState("listening");
    // Simulate flow
    setTimeout(() => setVoiceState("processing"), 3000);
    setTimeout(() => setVoiceState("confirming"), 5000);
  };

  const confirmAction = () => {
    setVoiceState("success");
    setTimeout(() => setVoiceState("idle"), 2500);
  };

  const cancelAction = () => {
    setVoiceState("idle");
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={startListening}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 h-14 w-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-primary/90 transition-colors border border-primary/20"
      >
        <Mic className="h-6 w-6" />
      </motion.button>

      {/* Elegant Overlay UI */}
      <AnimatePresence>
        {voiceState !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:p-8 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full max-w-lg bg-card border border-border/40 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-6 relative">
                <button
                  onClick={cancelAction}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* States */}
                {voiceState === "listening" && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary"
                    >
                      <Mic className="h-8 w-8" />
                    </motion.div>
                    <p className="text-xl font-heading font-medium tracking-tight">
                      Listening...
                    </p>
                    <p className="text-sm text-muted-foreground font-light text-center max-w-xs">
                      Try: &quot;Order 50 kg of Paneer from nearest distributor.&quot;
                    </p>
                  </div>
                )}

                {voiceState === "processing" && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-xl font-heading font-medium tracking-tight">
                      Interpreting...
                    </p>
                    <p className="text-sm text-muted-foreground font-light italic text-center">
                      &quot;Order 50 kg of Paneer...&quot;
                    </p>
                  </div>
                )}

                {voiceState === "confirming" && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-2">
                        Confirm Action
                      </p>
                      <h3 className="text-2xl font-heading font-medium tracking-tight">
                        Order 50kg Paneer
                      </h3>
                    </div>

                    <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Package className="h-4 w-4" /> Supplier
                        </span>
                        <span className="font-medium">
                          Sri Dairy Distributors
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-border/40 pt-3">
                        <span className="text-muted-foreground">Est. Cost</span>
                        <span className="font-medium">₹12,500</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-border/40 pt-3">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className="font-medium text-green-500">
                          Tomorrow Morning
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={cancelAction}
                        className="flex-1 border border-border/40 bg-transparent hover:bg-muted text-foreground py-3 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmAction}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <Check className="h-4 w-4" /> Confirm Order
                      </button>
                    </div>
                  </div>
                )}

                {voiceState === "success" && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                      <Check className="h-8 w-8" />
                    </div>
                    <p className="text-2xl font-heading font-medium tracking-tight">
                      Order Placed
                    </p>
                    <p className="text-sm text-muted-foreground font-light text-center">
                      Your order has been sent to the supplier.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
