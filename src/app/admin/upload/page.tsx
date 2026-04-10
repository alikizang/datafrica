"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage, LANGUAGES } from "@/hooks/use-language";
import { Loader2, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AFRICAN_COUNTRIES, DATASET_CATEGORIES } from "@/types";
import Link from "next/link";

export default function UploadDatasetPage() {
  const { getIdToken } = useAuth();
  const { t } = useLanguage();

  const [title, setTitle] = useState("");
  const [titles, setTitles] = useState<Record<string, string>>({
    en: "", fr: "", pt: "", es: "", ar: "",
  });
  const [titleLang, setTitleLang] = useState("en");
  const [descriptions, setDescriptions] = useState<Record<string, string>>({
    en: "", fr: "", pt: "", es: "", ar: "",
  });
  const [descLang, setDescLang] = useState("en");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const effectiveTitle = titles.en || Object.values(titles).find(v => v) || "";

    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    if (!effectiveTitle || !category || !country || !price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        toast.error(t("common.error"));
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", titles.en || Object.values(titles).find(v => v) || title);
      formData.append("titles", JSON.stringify(titles));
      formData.append("description", descriptions.en || Object.values(descriptions).find(v => v) || "");
      formData.append("descriptions", JSON.stringify(descriptions));
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
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-24 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-bold text-foreground">{t("admin.uploadSuccess")}</h2>
        <p className="text-muted-foreground">
          {t("admin.uploadSuccessDesc")}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setSuccess(false); setTitle(""); setTitles({ en: "", fr: "", pt: "", es: "", ar: "" }); setDescriptions({ en: "", fr: "", pt: "", es: "", ar: "" }); setFile(null); }}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium"
          >
            {t("admin.uploadAnother")}
          </button>
          <Link
            href="/admin"
            className="px-6 py-2.5 border border-border text-foreground rounded-full hover:bg-muted transition-colors font-medium"
          >
            {t("admin.backToAdmin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10 max-w-2xl">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.backToAdmin")}
      </Link>

      <div className="glass-card rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("admin.uploadDataset")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.addToMarketplace")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* CSV File */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("admin.csvFile")} *</label>
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="bg-muted border-border text-foreground rounded-xl file:bg-card file:text-foreground file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3"
            />
            <p className="text-xs text-dim">{t("admin.csvHelp")}</p>
          </div>

          {/* Title (multi-language) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("admin.title")} *</label>
            <div className="flex gap-1 mb-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setTitleLang(l.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    titleLang === l.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {l.code.toUpperCase()}
                  {titles[l.code] ? " *" : ""}
                </button>
              ))}
            </div>
            <Input
              placeholder="e.g., Benin Business Directory 2025"
              value={titles[titleLang] || ""}
              onChange={(e) => setTitles(prev => ({ ...prev, [titleLang]: e.target.value }))}
              className="h-12 bg-muted border-border text-foreground placeholder:text-dim rounded-xl focus:border-primary"
            />
            <p className="text-xs text-dim">
              {t("admin.titleLangHelp")}
            </p>
          </div>

          {/* Description (multi-language) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("admin.description")}</label>
            <div className="flex gap-1 mb-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setDescLang(l.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    descLang === l.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {l.code.toUpperCase()}
                  {descriptions[l.code] ? " *" : ""}
                </button>
              ))}
            </div>
            <textarea
              className="flex min-h-[100px] w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-dim focus:outline-none focus:border-primary"
              placeholder={t("admin.descPlaceholder")}
              value={descriptions[descLang] || ""}
              onChange={(e) => setDescriptions(prev => ({ ...prev, [descLang]: e.target.value }))}
            />
            <p className="text-xs text-dim">
              {t("admin.descLangHelp")}
            </p>
          </div>

          {/* Category + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("admin.category")} *</label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger className="h-12 bg-muted border-border text-foreground rounded-xl">
                  <SelectValue placeholder={t("admin.select")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {DATASET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-popover-foreground focus:bg-muted focus:text-foreground">
                      {t(`categories.${cat}`) !== `categories.${cat}` ? t(`categories.${cat}`) : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("admin.country")} *</label>
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger className="h-12 bg-muted border-border text-foreground rounded-xl">
                  <SelectValue placeholder={t("admin.select")} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {AFRICAN_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-popover-foreground focus:bg-muted focus:text-foreground">
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
              <label className="text-sm font-medium text-foreground">{t("admin.price")} *</label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="e.g., 5000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="h-12 bg-muted border-border text-foreground placeholder:text-dim rounded-xl focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("admin.currency")}</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-12 bg-muted border-border text-foreground rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="XOF" className="text-popover-foreground focus:bg-muted focus:text-foreground">CFA (XOF)</SelectItem>
                  <SelectItem value="USD" className="text-popover-foreground focus:bg-muted focus:text-foreground">USD ($)</SelectItem>
                  <SelectItem value="NGN" className="text-popover-foreground focus:bg-muted focus:text-foreground">NGN</SelectItem>
                  <SelectItem value="KES" className="text-popover-foreground focus:bg-muted focus:text-foreground">KES</SelectItem>
                  <SelectItem value="GHS" className="text-popover-foreground focus:bg-muted focus:text-foreground">GHS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Rows */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("admin.previewRows")}</label>
            <Input
              type="number"
              min="1"
              max="50"
              value={previewRows}
              onChange={(e) => setPreviewRows(e.target.value)}
              className="h-12 bg-muted border-border text-foreground rounded-xl focus:border-primary"
            />
            <p className="text-xs text-dim">
              {t("admin.previewRowsHelp")}
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4 p-4 rounded-xl bg-muted border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("admin.allowDownload")}</p>
                <p className="text-xs text-dim">
                  {t("admin.allowDownloadDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllowDownload(!allowDownload)}
                className={`w-11 h-6 rounded-full transition-colors ${
                  allowDownload ? "bg-primary" : "bg-card"
                } relative`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5`}
                  style={{ transform: allowDownload ? "translateX(20px)" : "translateX(0)" }}
                />
              </button>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t("admin.featuredDataset")}</p>
                <p className="text-xs text-dim">
                  {t("admin.featuredDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeatured(!featured)}
                className={`w-11 h-6 rounded-full transition-colors ${
                  featured ? "bg-primary" : "bg-card"
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
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("admin.uploadingProcessing")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                {t("admin.uploadDataset")}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
