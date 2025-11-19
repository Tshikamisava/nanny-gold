import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SupabaseTest from '@/components/SupabaseTest';

export default function TailwindDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center fade-in">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Tailwind CSS Utilities Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Showcasing custom utility classes and components
          </p>
        </div>

        {/* Supabase Test */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Supabase Connection Test</CardTitle>
            <CardDescription>
              Testing if Supabase is properly configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseTest />
          </CardContent>
        </Card>

        {/* Flexbox Utilities */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Flexbox Utilities</CardTitle>
            <CardDescription>
              Common flexbox patterns for layout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex-center gap-4 p-4 bg-muted rounded-lg">
              <div className="w-12 h-12 bg-primary rounded-full"></div>
              <span className="text-lg">flex-center</span>
            </div>
            <div className="flex-between gap-4 p-4 bg-muted rounded-lg">
              <span className="text-sm">Left content</span>
              <span className="text-sm">Right content</span>
            </div>
            <div className="flex-col-center gap-4 p-4 bg-muted rounded-lg">
              <span className="text-sm">Vertical center</span>
              <span className="text-sm">with gap</span>
            </div>
          </CardContent>
        </Card>

        {/* Button Variants */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
            <CardDescription>
              Different button styles and sizes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>
              Input fields and form styling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="submit">Submit</Button>
              <Button variant="outline" type="button">Cancel</Button>
            </div>
          </CardContent>
        </Card>

        {/* Layout Utilities */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Layout Utilities</CardTitle>
            <CardDescription>
              Responsive layout helpers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="section-padding bg-muted rounded-lg">
              <div className="container-padding">
                <h3 className="text-xl font-semibold mb-4">Section with padding</h3>
                <p className="text-muted-foreground">
                  This section demonstrates responsive padding that adjusts based on screen size.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animation Utilities */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Animation Utilities</CardTitle>
            <CardDescription>
              Smooth animations for better UX
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="fade-in p-6 bg-primary/10 rounded-lg">
                <h4 className="font-semibold">Fade In</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Smooth fade-in animation
                </p>
              </div>
              <div className="slide-up p-6 bg-secondary/10 rounded-lg">
                <h4 className="font-semibold">Slide Up</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Slide up from bottom
                </p>
              </div>
              <div className="p-6 bg-accent/10 rounded-lg">
                <h4 className="font-semibold">Hover Effects</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Interactive hover states
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Grid */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle>Responsive Grid</CardTitle>
            <CardDescription>
              Responsive grid layouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <div className="w-full h-16 bg-primary/20 rounded mb-2"></div>
                <span className="text-sm">1 column on mobile</span>
              </div>
              <div className="p-4 bg-secondary/10 rounded-lg text-center">
                <div className="w-full h-16 bg-secondary/20 rounded mb-2"></div>
                <span className="text-sm">2 columns on tablet</span>
              </div>
              <div className="p-4 bg-accent/10 rounded-lg text-center">
                <div className="w-full h-16 bg-accent/20 rounded mb-2"></div>
                <span className="text-sm">4 columns on desktop</span>
              </div>
              <div className="p-4 bg-muted/10 rounded-lg text-center">
                <div className="w-full h-16 bg-muted/20 rounded mb-2"></div>
                <span className="text-sm">Responsive layout</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Text Gradient Example */}
        <Card className="slide-up">
          <CardHeader>
            <CardTitle className="text-gradient">Text Gradient</CardTitle>
            <CardDescription>
              Beautiful gradient text effects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gradient mb-4">
                Beautiful Gradient Text
              </h2>
              <p className="text-lg text-muted-foreground">
                This text uses a gradient from primary to secondary colors
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
