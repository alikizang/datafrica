"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-logged-in users
  useEffect(() => {
    if (!authLoading && user) {
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="h-14 w-14 mx-auto rounded-xl bg-gradient-to-br from-[#3d7eff] to-[#6c5ce7] flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-[#7a8ba3]">
              Sign in to your Datafrica account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-[#0d1a2d] border-white/[0.08] text-white placeholder:text-[#525f73] rounded-xl focus:border-[#3d7eff]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-[#0d1a2d] border-white/[0.08] text-white placeholder:text-[#525f73] rounded-xl focus:border-[#3d7eff]"
              />
            </div>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#3d7eff] text-white font-medium hover:bg-[#2d6eef] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center text-sm text-[#7a8ba3]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#3d7eff] font-medium hover:text-[#5a9aff]">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
