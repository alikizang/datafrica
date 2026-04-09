import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#080f1e]">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#3d7eff] to-[#6c5ce7] flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <span className="text-white">Datafrica</span>
            </Link>
            <p className="text-sm text-[#7a8ba3] leading-relaxed">
              The premier marketplace for African datasets. Access verified business directories,
              leads, and institutional data across the continent.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white uppercase tracking-wider">Marketplace</h4>
            <div className="space-y-3">
              <Link href="/datasets" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Browse Datasets
              </Link>
              <Link href="/datasets?category=Business" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Business Data
              </Link>
              <Link href="/datasets?category=Leads" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Leads & Contacts
              </Link>
              <Link href="/datasets?category=E-commerce" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                E-commerce
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white uppercase tracking-wider">Company</h4>
            <div className="space-y-3">
              <Link href="#" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                About
              </Link>
              <Link href="#" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Contact
              </Link>
              <Link href="#" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white uppercase tracking-wider">Resources</h4>
            <div className="space-y-3">
              <Link href="#" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                API Documentation
              </Link>
              <Link href="#" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Data Quality
              </Link>
              <Link href="/register" className="block text-sm text-[#7a8ba3] hover:text-[#3d7eff] transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[#525f73]">
            &copy; {new Date().getFullYear()} Datafrica. All rights reserved.
          </p>
          <p className="text-sm text-[#525f73]">
            Africa&apos;s data, unlocked.
          </p>
        </div>
      </div>
    </footer>
  );
}
