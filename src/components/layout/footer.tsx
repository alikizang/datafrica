import Link from "next/link";
import { Database } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Database className="h-5 w-5 text-primary" />
              <span>Datafrica</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The premier marketplace for African datasets. Access business data,
              leads, and more across the continent.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Marketplace</h4>
            <div className="space-y-2">
              <Link href="/datasets" className="block text-sm text-muted-foreground hover:text-foreground">
                Browse Datasets
              </Link>
              <Link href="/datasets?category=Business" className="block text-sm text-muted-foreground hover:text-foreground">
                Business Data
              </Link>
              <Link href="/datasets?category=Leads" className="block text-sm text-muted-foreground hover:text-foreground">
                Leads
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Company</h4>
            <div className="space-y-2">
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                About
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                Contact
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Developers</h4>
            <div className="space-y-2">
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                API (Coming Soon)
              </Link>
              <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground">
                Documentation
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Datafrica. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built for Africa, powered by data.
          </p>
        </div>
      </div>
    </footer>
  );
}
