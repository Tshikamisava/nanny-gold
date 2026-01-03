import { Heart, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-t border-primary/10">
      <div className="container mx-auto px-3 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 sm:gap-3">
          {/* Brand */}
          <div className="flex items-center space-x-1.5">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-primary fill-primary" />
            <h3 className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Dancing Script, cursive' }}>
              <span style={{ color: '#d61784' }}>Nanny</span>
              <span style={{ color: '#d4af37' }}>Gold</span>
            </h3>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 text-xs">
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
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
            <a href="mailto:support@nannygold.com" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">support@nannygold.com</span>
            </a>
            <a href="tel:+27123456789" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">+27 12 345 6789</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-2 pt-2 border-t border-primary/10 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            © {currentYear} NannyGold. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
