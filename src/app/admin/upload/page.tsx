"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AFRICAN_COUNTRIES, DATASET_CATEGORIES } from "@/types";
import Link from "next/link";

export default function UploadDatasetPage() {
  const router = useRouter();
  const { user, loading: authLoading, getIdToken } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [previewRows, setPreviewRows] = useState("10");
  const [featured, setFeatured] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    if (!title || !category || !country || !price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        toast.error("Authentication error");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("country", country);
      formData.append("price", price);
      formData.append("currency", currency);
      formData.append("previewRows", previewRows);
      formData.append("featured", featured.toString());
      formData.append("allowDownload", allowDownload.toString());

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        toast.success(
          `Dataset uploaded: ${data.recordCount} records, ${data.columns.length} columns`
        );
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return null;

  if (success) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-24 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Dataset Uploaded Successfully!</h2>
        <p className="text-[#7a8ba3]">
          Your dataset is now available on the marketplace.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSuccess(false); setTitle(""); setDescription(""); setFile(null); }}
            className="px-6 py-2.5 bg-[#3d7eff] text-white rounded-full hover:bg-[#2d6eef] transition-colors font-medium"
          >
            Upload Another
          </button>
          <Link
            href="/admin"
            className="px-6 py-2.5 border border-white/10 text-white rounded-full hover:bg-white/5 transition-colors font-medium"
          >
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10 max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      <div className="glass-card rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-[#3d7eff]/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-[#3d7eff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Upload Dataset</h1>
            <p className="text-sm text-[#7a8ba3]">Add new data to the marketplace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CSV File */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c8d6e5]">CSV File *</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="bg-[#0d1a2d] border-white/[0.08] text-[#c8d6e5] rounded-xl file:bg-[#1a2a42] file:text-[#c8d6e5] file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3"
            />
            <p className="text-xs text-[#525f73]">Upload a CSV file with headers in the first row</p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c8d6e5]">Title *</label>
            <Input
              placeholder="e.g., Benin Business Directory 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-12 bg-[#0d1a2d] border-white/[0.08] text-white placeholder:text-[#525f73] rounded-xl focus:border-[#3d7eff]"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c8d6e5]">Description</label>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-white/[0.08] bg-[#0d1a2d] px-4 py-3 text-sm text-white placeholder:text-[#525f73] focus:outline-none focus:border-[#3d7eff]"
              placeholder="Describe the dataset content, source, and use cases..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Category *</label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="h-12 bg-[#0d1a2d] border-white/[0.08] text-[#c8d6e5] rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#111d32] border-white/10">
                  {DATASET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Country *</label>
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger className="h-12 bg-[#0d1a2d] border-white/[0.08] text-[#c8d6e5] rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-[#111d32] border-white/10">
                  {AFRICAN_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Price *</label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="e.g., 5000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="h-12 bg-[#0d1a2d] border-white/[0.08] text-white placeholder:text-[#525f73] rounded-xl focus:border-[#3d7eff]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#c8d6e5]">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-12 bg-[#0d1a2d] border-white/[0.08] text-[#c8d6e5] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111d32] border-white/10">
                  <SelectItem value="XOF" className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">CFA (XOF)</SelectItem>
                  <SelectItem value="USD" className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">USD ($)</SelectItem>
                  <SelectItem value="NGN" className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">NGN</SelectItem>
                  <SelectItem value="KES" className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">KES</SelectItem>
                  <SelectItem value="GHS" className="text-[#c8d6e5] focus:bg-white/5 focus:text-white">GHS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Rows */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#c8d6e5]">Preview Rows</label>
            <Input
              type="number"
              min="1"
              max="50"
              value={previewRows}
              onChange={(e) => setPreviewRows(e.target.value)}
              className="h-12 bg-[#0d1a2d] border-white/[0.08] text-white rounded-xl focus:border-[#3d7eff]"
            />
            <p className="text-xs text-[#525f73]">
              Number of rows visible in the free preview before purchase (default: 10)
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 p-4 rounded-xl bg-[#0d1a2d] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Allow Download</p>
                <p className="text-xs text-[#525f73]">
                  If disabled, users can only view the data online after purchase (no CSV/Excel/JSON download)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllowDownload(!allowDownload)}
                className={`w-11 h-6 rounded-full transition-colors ${
                  allowDownload ? "bg-[#3d7eff]" : "bg-[#1a2a42]"
                } relative`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    allowDownload ? "translate-x-5.5 left-0.5" : "left-0.5"
                  }`}
                  style={{ transform: allowDownload ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Featured Dataset</p>
                <p className="text-xs text-[#525f73]">
                  Display this dataset prominently on the homepage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeatured(!featured)}
                className={`w-11 h-6 rounded-full transition-colors ${
                  featured ? "bg-[#3d7eff]" : "bg-[#1a2a42]"
                } relative`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5`}
                  style={{ transform: featured ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#3d7eff] text-white font-medium hover:bg-[#2d6eef] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Dataset
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
