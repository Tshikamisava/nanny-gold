const TailwindTest = () => {
  return (
    <div className="section-padding">
      <Card className="max-w-2xl mx-auto fade-in">
        <CardContent className="p-8">
          <div className="flex-col-center space-y-6">
            <h1 className="text-3xl font-bold text-gradient">Tailwind Test</h1>
            <p className="text-lg text-muted-foreground text-center">
              If you can see this styled content, Tailwind is working perfectly!
            </p>

            <div className="flex-center gap-4">
              <Button variant="primary" size="lg">
                Primary Button
              </Button>
              <Button variant="secondary" size="lg">
                Secondary Button
              </Button>
            </div>

            <div className="flex-center gap-4">
              <Button variant="outline" size="md">
                Outline Button
              </Button>
              <Button variant="ghost" size="md">
                Ghost Button
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              <div className="flex-center p-4 bg-accent rounded-lg text-center">
                <span className="text-sm font-medium">Accent Box</span>
              </div>
              <div className="flex-center p-4 bg-muted rounded-lg text-center">
                <span className="text-sm font-medium">Muted Box</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Responsive Text</h3>
              <p className="text-sm text-muted-foreground">
                This text adapts to different screen sizes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TailwindTest;
