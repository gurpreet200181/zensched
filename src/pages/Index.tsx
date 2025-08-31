
import { useState } from 'react';
import WellnessHero from '@/components/WellnessHero';
import DashboardDemo from '@/components/DashboardDemo';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <DashboardDemo />;
  }

  return (
    <div className="relative">
      <WellnessHero />
      
      {/* Demo trigger */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button 
          onClick={() => setShowDemo(true)}
          className="wellness-button shadow-2xl"
          size="lg"
        >
          View Dashboard Demo
        </Button>
      </div>
      
      {/* Features Preview Section */}
      <section className="py-20 bg-gradient-to-b from-sage-50 to-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold gradient-text mb-4">
              Mindful Scheduling, Powered by AI
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience a new way to manage your time with wellness-first calendar insights
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="wellness-card p-8 text-center">
              <div className="w-16 h-16 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Smart Busyness Scoring</h3>
              <p className="text-gray-600">Get real-time insights into your schedule density with our intelligent scoring system that prevents overwhelm.</p>
            </div>

            <div className="wellness-card p-8 text-center">
              <div className="w-16 h-16 bg-mint-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">AI Wellness Coach</h3>
              <p className="text-gray-600">Receive personalized recommendations to optimize your schedule for better focus and work-life balance.</p>
            </div>

            <div className="wellness-card p-8 text-center">
              <div className="w-16 h-16 bg-calm-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Seamless Integration</h3>
              <p className="text-gray-600">Connect with Google Calendar and ICS feeds for automatic synchronization and real-time updates.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
