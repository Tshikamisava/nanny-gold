import { Heart, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-t border-primary/10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <h3 className="text-xl font-bold">
              <span className="text-primary">Nanny</span>
              <span className="gold-shimmer">Gold</span>
            </h3>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Help
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Terms
            </a>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a href="mailto:support@nannygold.com" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">support@nannygold.com</span>
            </a>
            <a href="tel:+27123456789" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">+27 12 345 6789</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t border-primary/10 text-center">
          <p className="text-xs text-muted-foreground">
            © {currentYear} NannyGold. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
