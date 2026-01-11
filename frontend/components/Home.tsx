'use client';

import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { MapPin, Shield, Navigation, AlertTriangle, BarChart3, Radio, MessageSquare, Search } from 'lucide-react';

export default function Home() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as string) || 'citizen';
  const isAdmin = role === 'ward_admin' || role === 'admin';

  return (
    <div className="overflow-x-hidden relative w-full bg-white">
      {/* Navbar */}
      <nav className="bg-deepBlue">
        <div className="relative w-[1080px] mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="cursor-pointer py-7 pr-7">
            <div className="text-white text-2xl font-bold">
              <span className="text-greenLight">Flood</span>Watch
            </div>
          </Link>

          <ul className="flex space-x-6">
            <li className="text-white font-mullish py-7 hover:text-lightBlue cursor-pointer transition-all duration-200 relative group hidden lg:block">
              <Link href="/">Home</Link>
              <div className="absolute bottom-0 w-full h-1 bg-lightBlue hidden group-hover:block transition-all duration-200"></div>
            </li>
            <li className="text-white font-mullish py-7 hover:text-lightBlue cursor-pointer transition-all duration-200 relative group hidden lg:block">
              <Link href="/map">Map</Link>
              <div className="absolute bottom-0 w-full h-1 bg-lightBlue hidden group-hover:block transition-all duration-200"></div>
            </li>
            {isSignedIn && isAdmin && (
              <li className="text-white font-mullish py-7 hover:text-lightBlue cursor-pointer transition-all duration-200 relative group hidden lg:block">
                <Link href="/admin">Admin</Link>
                <div className="absolute bottom-0 w-full h-1 bg-lightBlue hidden group-hover:block transition-all duration-200"></div>
              </li>
            )}
            <li className="text-white font-mullish py-7 hover:text-lightBlue cursor-pointer transition-all duration-200 relative group hidden lg:block">
              <a href="#features">Features</a>
              <div className="absolute bottom-0 w-full h-1 bg-lightBlue hidden group-hover:block transition-all duration-200"></div>
            </li>
            <li className="text-white font-mullish py-7 hover:text-lightBlue cursor-pointer transition-all duration-200 relative group hidden lg:block">
              <a href="#about">About</a>
              <div className="absolute bottom-0 w-full h-1 bg-lightBlue hidden group-hover:block transition-all duration-200"></div>
            </li>
          </ul>

          <div className="flex space-x-6 items-center">
            <Link href="/map">
              <button className="py-3 px-5 font-mullish text-white border-lightBlue border rounded-sm text-sm font-bold hover:bg-lightBlue transition-all duration-200">
                View Map
              </button>
            </Link>
            <Link href="/complaints/file">
              <button className="py-3 px-5 font-mullish text-white border-lightBlue border rounded-sm text-sm font-bold hover:bg-lightBlue transition-all duration-200">
                File Complaint
              </button>
            </Link>
            <Link href="/complaints/track">
              <button className="py-3 px-5 font-mullish text-white border-lightBlue border rounded-sm text-sm font-bold hover:bg-lightBlue transition-all duration-200">
                Track Complaint
              </button>
            </Link>
            {isSignedIn && isAdmin && (
              <Link href="/admin">
                <button className="py-3 px-5 font-mullish text-white border-greenLight border rounded-sm text-sm font-bold hover:bg-greenLight hover:text-deepBlue transition-all duration-200">
                  🔧 Admin
                </button>
              </Link>
            )}
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="py-3 px-4 font-mullish rounded-sm text-sm font-bold bg-white text-lightBlue300 border transition-all duration-200 hover:text-lightBlue500 hidden lg:flex items-center">
                  Sign In
                  <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                    className="w-[14px] h-[14px] ml-3"
                  >
                    <path
                      fill="currentColor"
                      d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
                    ></path>
                  </svg>
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-deepBlue font-mullish pt-10 overflow-hidden">
        <div className="w-10/12 max-w-[1080px] flex flex-col justify-between items-center relative mx-auto py-10">
          {/* Left part */}
          <div className="flex flex-col justify-center items-center text-center py-10">
            <h1 className="text-white text-5xl font-bold leading-[1.2] max-w-[1000px]">
              Real-time Flood Monitoring & Prediction for Delhi
            </h1>
            <p className="text-white text-lg mt-8 opacity-80 max-w-[800px]">
              Empowering citizens and authorities with accurate waterlogging data, safe routes, and a robust complaint system.
            </p>
            <div className="flex space-x-4 mt-12">
              <Link href="/map">
                <button className="bg-lightBlue text-white py-[14px] px-[18px] rounded-md font-bold hover:bg-lightBlue500 transition-all duration-200">
                  View Live Map
                </button>
              </Link>
              <Link href="/complaints/file">
                <button className="bg-white text-lightBlue py-[14px] px-[18px] rounded-md font-bold hover:text-lightBlue500 transition-all duration-200">
                  File a Complaint
                </button>
              </Link>
            </div>
          </div>

          {/* Right part - Image */}
          <div className="w-full flex justify-center items-center mt-10">
            <img
              src="https://img.razorpay.com/static/homepage/hero.jpg"
              alt="Hero Image"
              className="w-full max-w-[800px] rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Wave background */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 320" className="w-full h-32 fill-white">
            <path d="M0,160L48,154.7C96,149,192,139,288,122.7C384,107,480,85,576,101.3C672,117,768,171,864,197.3C960,224,1056,224,1152,213.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </section>

      {/* Feature section - 1 */}
      <section id="features" className="relative mt-[50px] overflow-hidden py-20">
        <div className="relative w-11/12 max-w-[1080px] mx-auto pt-4">
          {/* Heading */}
          <h2 className="font-mullish text-center text-2xl leading-[1.2] font-extrabold hidden md:block">
            Explore FloodWatch Features
          </h2>
          <h2 className="font-mullish text-center text-5xl leading-[1.2] font-extrabold md:hidden">
            Explore FloodWatch Features
          </h2>
          <div className="w-6 h-1 bg-greenLight mx-auto mt-4 mb-6"></div>

          {/* Content box */}
          <div className="w-full min-h-[520px] bg-white flex rounded-md relative p-10 py-12 border">
            {/* Left section */}
            <div className="flex flex-col justify-between w-full">
              <h3 className="font-mullish text-[28px] leading-10 font-bold max-w-[500px]">
                Real-time flood risk monitoring with
                <span className="text-lightBlue"> AI-Powered Prediction</span>
              </h3>
              <ul className="space-y-2">
                <li className="font-mullish flex items-center space-x-2">
                  <Shield className="text-greenLight w-5 h-5" />
                  <span>Real-time Risk Assessment</span>
                </li>
                <li className="font-mullish flex items-center space-x-2">
                  <MapPin className="text-greenLight w-5 h-5" />
                  <span>Interactive Waterlogging Map</span>
                </li>
                <li className="font-mullish flex items-center space-x-2">
                  <Navigation className="text-greenLight w-5 h-5" />
                  <span>Safe Route Calculation</span>
                </li>
                <li className="font-mullish flex items-center space-x-2">
                  <AlertTriangle className="text-greenLight w-5 h-5" />
                  <span>Early Warning System</span>
                </li>
                <li className="font-mullish flex items-center space-x-2">
                  <BarChart3 className="text-greenLight w-5 h-5" />
                  <span>Detailed Analytics & Insights</span>
                </li>
                <li className="font-mullish flex items-center space-x-2">
                  <Radio className="text-greenLight w-5 h-5" />
                  <span>Ward-level Risk Analysis</span>
                </li>
              </ul>

              {/* Button and hyperlink */}
              <div className="flex flex-col-reverse md:flex-row items-center space-x-4 mt-6">
                <Link href="/map">
                  <button className="bg-lightBlue w-full md:w-fit text-white py-[14px] px-[18px] rounded-md font-mullish font-bold hover:bg-lightBlue500 transition-all duration-200">
                    Explore Map
                  </button>
                </Link>
                <div className="flex self-start md:items-center cursor-pointer group">
                  <a href="#about" className="font-mullish font-bold text-lightBlue500 group-hover:text-grayBlue transition-all duration-200">
                    Know More
                  </a>
                  <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                    className="w-5 h-5 text-lightBlue500 group-hover:text-grayBlue transition-all duration-200 ml-1"
                  >
                    <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
                  </svg>
                </div>
              </div>
            </div>
            {/* Right image placeholder */}
            <div className="absolute right-0 bottom-0 hidden md:block lg:block w-[400px] h-[400px] opacity-10">
              <MapPin className="w-full h-full text-lightBlue" />
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full mt-10">
            {/* Card 1 - File Complaint */}
            <div className="w-full min-h-[15rem] relative cursor-pointer hover:scale-105 transition-all duration-200">
              <div className="bg-lightBlue absolute right-3 top-3 w-12 h-12 rounded-full z-[8] flex items-center justify-center">
                <MessageSquare className="text-white w-6 h-6" />
              </div>
              <svg
                viewBox="0 0 349.32501220703125 225"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="stroke-1 stroke-[#818597] h-full w-full absolute z-[9] transition-all duration-200"
                style={{ strokeOpacity: 0.15 }}
              >
                <path
                  d="m 0 6 a 6 6 0 0 1 6 -6 h 250.32501220703125 a 16 16 0 0 1 11 5 l 77 77 a 16 16 0 0 1 5 11 v 126 a 6 6 0 0 1 -6 6 h -337.32501220703125 a 6 6 0 0 1 -6 -6 z"
                  fill="#fff"
                ></path>
              </svg>
              <div className="z-[100] absolute w-full h-full flex flex-col justify-between pl-5 py-6 pr-8">
                <div>
                  <h3 className="font-mullish font-bold text-deepBlueHead leading-[1.2] text-[1.375rem]">
                    File Complaints
                  </h3>
                  <p className="font-mullish text-grayText mt-6">
                    Report waterlogging incidents and other civic issues directly to authorities.
                  </p>
                </div>
                <Link href="/complaints/file" className="flex items-center cursor-pointer group">
                  <span className="font-mullish font-bold text-lightBlue500 group-hover:text-grayBlue transition-all duration-200">
                    File Now
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                    className="w-5 h-5 text-lightBlue500 group-hover:text-grayBlue transition-all duration-200 ml-1"
                  >
                    <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Card 2 - Track Complaint */}
            <div className="w-full min-h-[15rem] relative cursor-pointer hover:scale-105 transition-all duration-200">
              <div className="bg-lightBlue absolute right-3 top-3 w-12 h-12 rounded-full z-[8] flex items-center justify-center">
                <Search className="text-white w-6 h-6" />
              </div>
              <svg
                viewBox="0 0 349.32501220703125 225"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="stroke-1 stroke-[#818597] h-full w-full absolute z-[9] transition-all duration-200"
                style={{ strokeOpacity: 0.15 }}
              >
                <path
                  d="m 0 6 a 6 6 0 0 1 6 -6 h 250.32501220703125 a 16 16 0 0 1 11 5 l 77 77 a 16 16 0 0 1 5 11 v 126 a 6 6 0 0 1 -6 6 h -337.32501220703125 a 6 6 0 0 1 -6 -6 z"
                  fill="#fff"
                ></path>
              </svg>
              <div className="z-[100] absolute w-full h-full flex flex-col justify-between pl-5 py-6 pr-8">
                <div>
                  <h3 className="font-mullish font-bold text-deepBlueHead leading-[1.2] text-[1.375rem]">
                    Track Complaints
                  </h3>
                  <p className="font-mullish text-grayText mt-6">
                    Monitor the status and progress of your filed complaints in real-time.
                  </p>
                </div>
                <Link href="/complaints/track" className="flex items-center cursor-pointer group">
                  <span className="font-mullish font-bold text-lightBlue500 group-hover:text-grayBlue transition-all duration-200">
                    Track Now
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                    className="w-5 h-5 text-lightBlue500 group-hover:text-grayBlue transition-all duration-200 ml-1"
                  >
                    <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Card 3 - Ward Analysis */}
            <div className="w-full min-h-[15rem] relative cursor-pointer hover:scale-105 transition-all duration-200">
              <div className="bg-lightBlue absolute right-3 top-3 w-12 h-12 rounded-full z-[8] flex items-center justify-center">
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <svg
                viewBox="0 0 349.32501220703125 225"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
                className="stroke-1 stroke-[#818597] h-full w-full absolute z-[9] transition-all duration-200"
                style={{ strokeOpacity: 0.15 }}
              >
                <path
                  d="m 0 6 a 6 6 0 0 1 6 -6 h 250.32501220703125 a 16 16 0 0 1 11 5 l 77 77 a 16 16 0 0 1 5 11 v 126 a 6 6 0 0 1 -6 6 h -337.32501220703125 a 6 6 0 0 1 -6 -6 z"
                  fill="#fff"
                ></path>
              </svg>
              <div className="z-[100] absolute w-full h-full flex flex-col justify-between pl-5 py-6 pr-8">
                <div>
                  <h3 className="font-mullish font-bold text-deepBlueHead leading-[1.2] text-[1.375rem]">
                    Ward Risk Analysis
                  </h3>
                  <p className="font-mullish text-grayText mt-6">
                    Get detailed risk assessments and preparedness scores for each ward in Delhi
                  </p>
                </div>
                <Link href="/map" className="flex items-center cursor-pointer group">
                  <span className="font-mullish font-bold text-lightBlue500 group-hover:text-grayBlue transition-all duration-200">
                    View Analysis
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    focusable="false"
                    className="w-5 h-5 text-lightBlue500 group-hover:text-grayBlue transition-all duration-200 ml-1"
                  >
                    <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="w-full bg-gradient-to-br from-deepBlue to-grayBlue mt-14 relative py-20">
        <div className="relative w-11/12 max-w-[1080px] mx-auto pt-4">
          <h2 className="font-mullish font-bold text-2xl text-center text-white">Features</h2>
          <div className="w-6 h-1 bg-greenLight mx-auto mt-4 mb-6"></div>
          <p className="font-mullish text-center max-w-[450px] text-white mx-auto opacity-80">
            Empower your city with real-time flood monitoring and comprehensive risk analysis tools
          </p>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[2rem] mt-8">
            <div>
              <Shield className="text-greenLight w-10 h-10 mb-4" />
              <h3 className="font-mullish text-white text-lg font-bold my-4">Real-time Monitoring</h3>
              <p className="font-mullish text-white opacity-80">
                Continuous monitoring of flood-prone areas with instant updates on risk levels.
              </p>
            </div>
            <div>
              <MapPin className="text-greenLight w-10 h-10 mb-4" />
              <h3 className="font-mullish text-white text-lg font-bold my-4">Interactive Mapping</h3>
              <p className="font-mullish text-white opacity-80">
                Detailed maps showing risk zones, ward boundaries, and drainage networks.
              </p>
            </div>
            <div>
              <Navigation className="text-greenLight w-10 h-10 mb-4" />
              <h3 className="font-mullish text-white text-lg font-bold my-4">Smart Routing</h3>
              <p className="font-mullish text-white opacity-80">
                Calculate safe routes that avoid high-risk flood areas automatically.
              </p>
            </div>
            <div>
              <AlertTriangle className="text-greenLight w-10 h-10 mb-4" />
              <h3 className="font-mullish text-white text-lg font-bold my-4">Early Alerts</h3>
              <p className="font-mullish text-white opacity-80">
                Receive timely warnings about potential flooding in your area.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="bg-gradient-to-br from-lightBlue to-lightBlue500 w-full h-full relative min-h-[400px] py-20 flex items-center">
        <div className="w-11/12 max-w-[1080px] relative flex flex-row items-center mx-auto justify-between space-x-20">
          <div className="flex flex-col gap-5 mt-12 max-w-[600px]">
            <h2 className="font-mullish font-bold text-2xl text-white">Start Monitoring Flood Risks Today</h2>
            <div className="w-6 h-1 bg-greenLight"></div>
            <p className="font-mullish text-white">
              Get started with FloodWatch Delhi and protect your city from waterlogging risks.
            </p>
            <ul className="flex flex-row flex-wrap gap-x-11 text-white gap-y-3">
              <li className="font-mullish text-white flex flex-row items-center">
                <Shield className="text-greenLight w-4 h-4 mr-2" />
                <span>Real-time Updates</span>
              </li>
              <li className="font-mullish text-white flex flex-row items-center">
                <MapPin className="text-greenLight w-4 h-4 mr-2" />
                <span>Comprehensive Coverage</span>
              </li>
              <li className="font-mullish text-white flex flex-row items-center">
                <BarChart3 className="text-greenLight w-4 h-4 mr-2" />
                <span>Detailed Analytics</span>
              </li>
              <li className="font-mullish text-white flex flex-row items-center">
                <AlertTriangle className="text-greenLight w-4 h-4 mr-2" />
                <span>24/7 Monitoring</span>
              </li>
            </ul>
            <Link href="/map">
              <button className="min-w-[32px] font-mullish text-sm font-bold bg-white text-lightBlue300 border flex rounded-sm items-center hover:text-lightBlue500 transition-all duration-200 py-3 px-4 place-self-start">
                View Map
                <svg
                  viewBox="0 0 24 24"
                  focusable="false"
                  className="w-[14px] h-[14px] ml-3"
                >
                  <path
                    fill="currentColor"
                    d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"
                  ></path>
                </svg>
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
