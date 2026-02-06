export function ModernFooter() {
  return (
    <footer className="bg-zinc-950 border-t border-white/10 py-12 text-center text-white/40 text-sm font-mono">
      <div className="container mx-auto px-6">
        <p>&copy; {new Date().getFullYear()} APEX COLLECTION SYSTEM. POWERED BY BORLS.</p>
        <div className="mt-4 flex justify-center gap-6">
          <a href="#" className="hover:text-white transition-colors">PRIVACY</a>
          <a href="#" className="hover:text-white transition-colors">TERMS</a>
          <a href="#" className="hover:text-white transition-colors">STATUS</a>
        </div>
      </div>
    </footer>
  )
}
