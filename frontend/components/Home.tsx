'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { MapPin, Shield, Navigation, AlertTriangle, BarChart3, Radio, MessageSquare, Search, Menu, X } from 'lucide-react';
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
export default function Home() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  console.log("User in the frontend is ",user)
  const role = (user?.publicMetadata?.role as string) || 'citizen';
  const isAdmin = (user?.emailAddresses[0].emailAddress?.startsWith("aman"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="overflow-x-hidden relative w-full bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 min-h-screen text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* --- Ambient Background Effects --- */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000,transparent)]"></div>
        {/* Glowing Orbs */}
        <div className="absolute top-0 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-40 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      {/* --- Navbar (Glassmorphism) --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="relative w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="cursor-pointer group">
            <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                <Radio className="text-white w-5 h-5" />
              </div>
              <span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Flood</span>
                <span className="text-white">Watch</span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex space-x-8">
            {[
              { name: 'Home', path: '/' },
              { name: 'Map', path: '/map' },
              { name: 'Waterlogging', path: '/waterlogging' },
              { name: 'Flood Map', path: '/failsafe' },
              { name: 'File Complaint', path: '/complaints/file' },
              { name: 'Complaint Status', path: '/complaints/track' },
            ].map((item) => (
              <li key={item.name} className="relative group">
                <Link href={item.path} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors py-2 block">
                  {item.name}
                </Link>
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </li>
            ))}
            
            {isSignedIn && isAdmin && (
              <li className="relative group">
                <DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" className='bg-black'>Admin Panel</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuGroup>
      <DropdownMenuLabel>My Account</DropdownMenuLabel>
      <DropdownMenuItem>Profile</DropdownMenuItem>
      <DropdownMenuItem>Billing</DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Team</DropdownMenuItem>
      <DropdownMenuItem>Subscription</DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>
              </li>
            )}
          </ul>

          {/* Auth & Actions */}
          <div className="flex space-x-4 items-center">
            {isSignedIn && isAdmin && (
               <Link href="/admin" className="hidden lg:block">
                 <button className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-400 border border-amber-400/30 rounded-lg hover:bg-amber-400/10 transition-all">
                   🔧 Admin
                 </button>
               </Link>
            )}
            
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: "w-10 h-10 ring-2 ring-cyan-500/50" } }}/>
            </SignedIn>
            
            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-950 font-bold text-sm hover:bg-cyan-50 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                  Sign In
                  <Shield className="w-4 h-4" />
                </button>
              </SignInButton>
            </SignedOut>

            {/* Mobile Menu Toggle */}
            <button className="lg:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Live Monitoring Active
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] mb-8 tracking-tight">
            Real-time Flood <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">
              Intelligence
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            Empowering citizens and authorities with accurate waterlogging data, safe routes, and a robust complaint system for a safer Delhi.
          </p>

          <div className="flex flex-wrap justify-center gap-4 w-full max-w-3xl">
            <Link href="/map" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-300">
                View Live Map
              </button>
            </Link>
            <Link href="/complaints/file" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-800/50 border border-slate-700 text-white font-bold text-lg hover:bg-slate-800 hover:border-cyan-500/50 backdrop-blur-md transition-all duration-300">
                File Complaint
              </button>
            </Link>
          </div>

          {/* Hero Visual / Dashboard Preview */}

        </div>
      </section>

      {/* --- Bento Grid Features Section --- */}
      <section id="features" className="relative py-24 px-6 bg-slate-950/50">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Explore <span className="text-cyan-400">Features</span></h2>
            <div className="w-24 h-1 bg-cyan-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
            
            {/* Feature 1: Main AI Risk (Large Card) */}
            <div className="md:col-span-2 md:row-span-2 relative rounded-3xl overflow-hidden bg-slate-900/40 border border-white/10 group hover:border-cyan-500/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="p-10 h-full flex flex-col justify-between relative z-10">
                <div>
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-6">
                        <Shield className="text-cyan-400 w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-4">AI-Powered Risk Monitoring</h3>
                    <p className="text-slate-400 mb-8 max-w-md">
                        Real-time assessment using advanced predictive models. Get safe route calculations and detailed ward-level analytics instantly.
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {[
                            { icon: MapPin, text: "Interactive Maps" },
                            { icon: AlertTriangle, text: "Early Warning" },
                            { icon: Navigation, text: "Safe Routes" },
                            { icon: BarChart3, text: "Ward Analytics" },
                        ].map((f, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                <f.icon className="w-4 h-4 text-cyan-500" /> {f.text}
                            </li>
                        ))}
                    </ul>
                </div>
                <Link href="/map">
                    <button className="w-fit px-6 py-3 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors flex items-center gap-2">
                        Explore Map <Navigation className="w-4 h-4" />
                    </button>
                </Link>
              </div>
            </div>

            {/* Feature 2: File Complaint */}
            <Link href="/complaints/file" className="block group">
                <div className="h-full rounded-3xl bg-slate-900/40 border border-white/10 p-8 hover:bg-slate-800/40 hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <MessageSquare className="w-10 h-10 text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">File Complaints</h3>
                    <p className="text-sm text-slate-400">Report incidents directly to authorities.</p>
                    <div className="mt-4 text-blue-400 text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Report Now <span className="text-lg">→</span>
                    </div>
                </div>
            </Link>

            {/* Feature 3: Track Complaint */}
            <Link href="/complaints/track" className="block group">
                <div className="h-full rounded-3xl bg-slate-900/40 border border-white/10 p-8 hover:bg-slate-800/40 hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <Search className="w-10 h-10 text-purple-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Track Status</h3>
                    <p className="text-sm text-slate-400">Monitor your complaint progress in real-time.</p>
                    <div className="mt-4 text-purple-400 text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        Check Status <span className="text-lg">→</span>
                    </div>
                </div>
            </Link>

            {/* Feature 4: Ward Analysis */}
             <div className="md:col-span-1 rounded-3xl bg-slate-900/40 border border-white/10 p-8 hover:border-green-500/30 transition-all duration-300">
                <BarChart3 className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Ward Analysis</h3>
                <p className="text-sm text-slate-400 mb-4">Detailed risk scores for every administrative ward.</p>
                 <Link href="/map" className="text-green-400 text-sm font-bold hover:underline">View Analysis</Link>
            </div>
            
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section id="about" className="py-24 relative overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-6 relative z-10">
            <div className="rounded-[3rem] bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-cyan-500/20 p-12 md:p-20 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10 backdrop-blur-xl">
                <div className="max-w-xl">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to stay safe?</h2>
                    <p className="text-slate-300 text-lg mb-8">
                        Join thousands of Delhi citizens using FloodWatch to navigate safely and report issues instantly.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                        <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 bg-cyan-950/50 px-4 py-2 rounded-full border border-cyan-500/20">
                            <Shield className="w-4 h-4" /> 24/7 Monitoring
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-300 bg-blue-950/50 px-4 py-2 rounded-full border border-blue-500/20">
                            <MapPin className="w-4 h-4" /> City-wide Coverage
                        </div>
                    </div>
                </div>
                <div className="shrink-0">
                    <Link href="/map">
                        <button className="px-10 py-5 rounded-2xl bg-white text-slate-950 font-black text-xl hover:scale-105 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-all duration-300">
                            Launch Map
                        </button>
                    </Link>
                </div>
            </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-white/5 bg-slate-950 pt-20 pb-10">
        <div className="w-full max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div className="md:col-span-2">
                    <div className="text-2xl font-black text-white mb-4">Flood<span className="text-cyan-400">Watch</span></div>
                    <p className="text-slate-500 max-w-sm">
                        An advanced civic technology initiative to mitigate flood risks and improve urban resilience in Delhi.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-white mb-4">Platform</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                        <li><Link href="/" className="hover:text-cyan-400">Home</Link></li>
                        <li><Link href="/map" className="hover:text-cyan-400">Live Map</Link></li>
                        <li><Link href="/flood-map" className="hover:text-cyan-400">Prediction Model</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-white mb-4">Action</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                        <li><Link href="/complaints/file" className="hover:text-cyan-400">File Complaint</Link></li>
                        <li><Link href="/complaints/track" className="hover:text-cyan-400">Track Status</Link></li>
                        {isSignedIn && isAdmin && (
                             <li><Link href="/admin" className="text-amber-500 hover:text-amber-400">Admin Login</Link></li>
                        )}
                    </ul>
                </div>
            </div>
            <div className="border-t border-white/5 pt-8 text-center md:text-left text-sm text-slate-600 flex flex-col md:flex-row justify-between items-center">
                <p>© 2026 FloodWatch Delhi. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms</a>
                    <a href="#" className="hover:text-white transition-colors">Contact</a>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}