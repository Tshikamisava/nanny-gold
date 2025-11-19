import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Languages } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguages: string;
  onChange: (languages: string) => void;
  disabled?: boolean;
}

const AVAILABLE_LANGUAGES = [
  'English',
  'French', 
  'Zulu',
  'Ndebele',
  'seTswana',
  'seSotho'
];

export default function LanguageSelector({ selectedLanguages, onChange, disabled }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  
  // Convert comma-separated string to array
  const selectedArray = selectedLanguages ? selectedLanguages.split(',').map(lang => lang.trim()) : [];
  
  const handleLanguageToggle = (language: string, checked: boolean) => {
    let newSelection: string[];
    
    if (checked) {
      newSelection = [...selectedArray, language];
    } else {
      newSelection = selectedArray.filter(lang => lang !== language);
    }
    
    // Convert back to comma-separated string
    onChange(newSelection.join(', '));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full h-11 rounded-xl border-accent/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 justify-between"
        >
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-muted-foreground" />
            <span className="text-left">
              {selectedArray.length > 0 
                ? selectedArray.length === 1 
                  ? selectedArray[0] 
                  : `${selectedArray.length} languages selected`
                : 'Select languages'
              }
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-3 space-y-2">
          <div className="text-sm font-medium text-foreground mb-2">Select preferred languages:</div>
          {AVAILABLE_LANGUAGES.map((language) => (
            <div key={language} className="flex items-center space-x-2">
              <Checkbox
                id={language}
                checked={selectedArray.includes(language)}
                onCheckedChange={(checked) => handleLanguageToggle(language, checked as boolean)}
                disabled={disabled}
              />
              <label 
                htmlFor={language} 
                className="text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
              >
                {language}
              </label>
            </div>
          ))}
          {selectedArray.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => onChange('')}
                disabled={disabled}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}