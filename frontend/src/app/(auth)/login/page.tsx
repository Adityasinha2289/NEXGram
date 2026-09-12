"use client";

import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi } from "@/lib/api/auth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const formSchema = z.object({
  phone: z.string().min(10, {
    message: "Enter a valid 10-digit mobile number.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      // Actual API call
      const tokens = await authApi.login(values.phone, values.password);
      localStorage.setItem("access_token", tokens.access_token);

      const user = await authApi.getMe();

      login({
        id: user.id,
        name: user.name,
        role: user.role,
        profile_id: user.profile_id,
        profile_complete: user.profile_complete,
      });

      toast.success("Welcome back.");
      router.push(user.role === "retailer" ? "/retailer" : "/distributor");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.detail ||
            "Authentication failed. Please try again.",
        );
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Pane - Editorial & Cinematic */}
      <div className="hidden md:flex flex-1 relative items-end justify-start p-16 overflow-hidden">
        {/* Soft abstract gradient mimicking the color palette image */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-background to-secondary opacity-20" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />

        <div className="relative z-10 max-w-xl text-left">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-heading font-medium tracking-widest uppercase text-sm text-primary">
              NEXGram
            </span>
          </div>
          <h1 className="text-5xl font-heading font-normal tracking-tight text-foreground leading-[1.1]">
            Intelligence for the businesses that keep India moving.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground font-light max-w-md leading-relaxed">
            AI-powered demand intelligence, smart procurement, and local
            opportunities designed for the modern retailer and distributor.
          </p>
        </div>
      </div>

      {/* Right Pane - Minimal Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-card">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm space-y-12"
        >
          <div className="space-y-3">
            <h2 className="text-3xl font-heading tracking-tight text-foreground">
              Sign In
            </h2>
            <p className="text-muted-foreground text-sm font-light">
              Enter your registered mobile number to continue.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Mobile Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="98765 43210"
                          {...field}
                          className="h-12 border-b-2 border-t-0 border-l-0 border-r-0 border-muted bg-transparent rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors placeholder:text-muted-foreground/30 text-lg"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Password
                        </FormLabel>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot?
                        </button>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="h-12 border-b-2 border-t-0 border-l-0 border-r-0 border-muted bg-transparent rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary transition-colors placeholder:text-muted-foreground/30 text-lg"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide transition-all rounded-md"
              >
                {isLoading ? "Signing in..." : "Continue"}
              </Button>


            </form>
          </Form>

          <p className="text-center text-xs text-muted-foreground font-light">
            By continuing, you agree to our{" "}
            <a
              href="#"
              className="underline hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
