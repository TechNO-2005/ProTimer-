import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Clock, BarChart2, Calendar, BookOpen } from "lucide-react";

const LandingPage = () => {
  const { enableGuestMode } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] to-black text-white">
      <header className="container mx-auto py-6 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="font-['Jaro'] text-3xl text-white">ProTimer</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth">
            <Button variant="outline" className="text-white border-white hover:bg-white/10">
              Sign In
            </Button>
          </Link>
          <Button 
            className="bg-[#388282] hover:bg-[#275050] text-white"
            onClick={() => enableGuestMode()}
          >
            Try for Free
          </Button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-4xl">
            Boost Your Productivity with Smart Time Management
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl">
            ProTimer helps you manage your schedule, track habits, prioritize tasks, and learn efficiently - all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/auth">
              <Button className="bg-[#388282] hover:bg-[#275050] text-white text-lg px-8 py-6">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="text-white border-white hover:bg-white/10 text-lg px-8 py-6"
              onClick={() => enableGuestMode()}
            >
              Try Guest Mode
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl">
              <div className="bg-[#388282] p-3 rounded-full w-fit mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Scheduling</h3>
              <p className="text-gray-300">Plan your day with an intelligent calendar that adapts to your work habits and priorities.</p>
            </div>
            
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl">
              <div className="bg-[#388282] p-3 rounded-full w-fit mb-4">
                <BarChart2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Task Prioritization</h3>
              <p className="text-gray-300">Focus on what matters most with our intuitive task priority system.</p>
            </div>
            
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl">
              <div className="bg-[#388282] p-3 rounded-full w-fit mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Habit Tracking</h3>
              <p className="text-gray-300">Build positive routines with visual habit tracking and streak maintenance.</p>
            </div>
            
            <div className="bg-gray-900 bg-opacity-60 p-6 rounded-xl">
              <div className="bg-[#388282] p-3 rounded-full w-fit mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Learning Tools</h3>
              <p className="text-gray-300">Enhance knowledge retention with flashcards and spaced repetition system.</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-gradient-to-r from-[#388282] to-[#234848] py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform your productivity?</h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of users who have improved their time management and achieved their goals with ProTimer.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/auth">
                <Button className="bg-white text-[#388282] hover:bg-white/90 text-lg px-8 py-6">
                  Sign Up Free
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="text-white border-white hover:bg-white/10 text-lg px-8 py-6"
                onClick={() => enableGuestMode()}
              >
                Try Without Account
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="font-['Jaro'] text-2xl text-white mb-2">ProTimer</h2>
              <p className="text-gray-400">Your ultimate productivity companion</p>
            </div>
            <div className="flex gap-8">
              <div className="text-gray-400 hover:text-white cursor-pointer">About</div>
              <div className="text-gray-400 hover:text-white cursor-pointer">Privacy</div>
              <div className="text-gray-400 hover:text-white cursor-pointer">Terms</div>
              <div className="text-gray-400 hover:text-white cursor-pointer">Contact</div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            &copy; {new Date().getFullYear()} ProTimer. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
