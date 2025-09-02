
import { Calendar, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import AuthDialog from './AuthDialog';

const WellnessHero = () => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-white/10 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Logo/Icon */}
          <div className="mb-8 animate-fade-in">
            <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 breathe">
              <Calendar className="h-12 w-12 text-white" />
            </div>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 text-shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <span className="gradient-text bg-gradient-to-r from-white to-white/80 bg-clip-text">
              ZenSched
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed text-shadow animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Transform your chaotic calendar into a mindful, balanced schedule with AI-powered wellness insights
          </p>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-8 mb-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="glass p-6 rounded-2xl">
              <Calendar className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Smart Calendar Sync</h3>
              <p className="text-white/80 text-sm">Connect Google Calendar & ICS feeds with real-time updates</p>
            </div>
            
            <div className="glass p-6 rounded-2xl">
              <Brain className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">AI Wellness Coach</h3>
              <p className="text-white/80 text-sm">Personalized recommendations for better work-life balance</p>
            </div>
            
            <div className="glass p-6 rounded-2xl">
              <Zap className="h-8 w-8 text-white mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Busyness Insights</h3>
              <p className="text-white/80 text-sm">Smart scoring system to prevent overwhelm and burnout</p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <Button 
              size="lg"
              onClick={() => setShowAuthDialog(true)}
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 hover:border-white/50 rounded-xl px-8 py-4 text-lg font-medium transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started Free
            </Button>
            
            <Button 
              variant="outline"
              size="lg"
              className="bg-transparent border-2 border-white/50 hover:bg-white/10 text-white hover:text-white rounded-xl px-8 py-4 text-lg font-medium transition-all duration-300"
            >
              View Demo
            </Button>
          </div>

          {/* Status indicator */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: '1s' }}>
            <p className="text-white/70 text-sm">
              ✨ Currently in Beta • Join 500+ mindful professionals
            </p>
          </div>
        </div>
      </div>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
};

export default WellnessHero;
