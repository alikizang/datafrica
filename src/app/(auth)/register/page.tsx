"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, name);
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create account";
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
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-sm text-[#7a8ba3]">
              Join Datafrica to access African datasets
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Full name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 bg-[#0d1a2d] border-white/[0.08] text-white placeholder:text-[#525f73] rounded-xl focus:border-[#3d7eff]"
              />
            </div>
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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="text-center text-sm text-[#7a8ba3]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#3d7eff] font-medium hover:text-[#5a9aff]">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
