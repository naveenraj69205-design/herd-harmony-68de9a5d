import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Beef, ChevronRight, BarChart3, Brain, Thermometer, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
                <Beef className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">MooAI</span>
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <Button variant="hero" size="lg">
                    Go to Dashboard
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth">
                    <Button variant="ghost" className="text-foreground">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="hero">
                      Get Started
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Brain className="h-4 w-4" />
            AI-Powered Breeding Management
          </div>
          
          <h1 className="font-display text-5xl lg:text-7xl font-bold text-foreground leading-tight">
            Smart Breeding for
            <span className="block text-primary">Modern Farms</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Harness the power of artificial intelligence to optimize your cattle breeding, 
            detect heat cycles with 95% accuracy, and manage your herd efficiently.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="min-w-[200px]">
                Start Free Trial
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="xl" className="min-w-[200px]">
              Watch Demo
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8">
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-primary">95%</p>
              <p className="text-sm text-muted-foreground">Detection Rate</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-primary">10K+</p>
              <p className="text-sm text-muted-foreground">Cows Managed</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-primary">500+</p>
              <p className="text-sm text-muted-foreground">Farms</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools designed specifically for modern cattle breeding operations
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Brain,
              title: 'AI Chatbot',
              description: 'Get instant answers about breeding, health, and herd management from our AI assistant.'
            },
            {
              icon: Thermometer,
              title: 'Heat Detection',
              description: 'AI-powered heat cycle detection with 95% accuracy for optimal breeding timing.'
            },
            {
              icon: BarChart3,
              title: 'Analytics Dashboard',
              description: 'Real-time insights into your herd\'s health, breeding success, and productivity.'
            },
            {
              icon: Shield,
              title: 'Secure & Reliable',
              description: 'Enterprise-grade security to keep your farm data safe and accessible.'
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative rounded-3xl overflow-hidden gradient-primary p-12 lg:p-20 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-30" />
          
          <div className="relative z-10 space-y-6">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-primary-foreground">
              Ready to Transform Your Farm?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Join hundreds of farmers already using MooAI to improve their breeding success rates.
            </p>
            <Link to="/auth">
              <Button 
                variant="secondary" 
                size="xl" 
                className="mt-4 bg-background text-primary hover:bg-background/90"
              >
                Get Started Free
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Beef className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground">MooAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 MooAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
