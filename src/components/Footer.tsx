import { Heart, Mail, Phone } from 'lucide-react';

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


          {/* Contact */}
          <div className="flex flex-col items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="mailto:care@nannygold.co.za" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">care@nannygold.co.za</span>
              </a>
              <a href="tel:+27662733942" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">+27 66 273 3942</span>
              </a>
            </div>
            <div className="text-center text-[10px] sm:text-xs">
              Johannesburg, South Africa
            </div>
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
