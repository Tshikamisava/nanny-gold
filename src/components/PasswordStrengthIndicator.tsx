import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  {
    label: "At least 8 characters",
    test: (password) => password.length >= 8
  },
  {
    label: "Contains uppercase letter",
    test: (password) => /[A-Z]/.test(password)
  },
  {
    label: "Contains lowercase letter", 
    test: (password) => /[a-z]/.test(password)
  },
  {
    label: "Contains number",
    test: (password) => /[0-9]/.test(password)
  },
  {
    label: "Contains special character",
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }
];

export const PasswordStrengthIndicator = ({ password, className }: PasswordStrengthProps) => {
  const passedRules = passwordRules.filter(rule => rule.test(password));
  const strength = passedRules.length;
  const strengthPercentage = (strength / passwordRules.length) * 100;
  
  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-orange-500';
    if (strength <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getStrengthLabel = () => {
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };
  
  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium",
            strength <= 2 && "text-red-500",
            strength === 3 && "text-orange-500", 
            strength === 4 && "text-yellow-600",
            strength === 5 && "text-green-500"
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 ease-out",
              getStrengthColor()
            )}
            style={{ width: `${strengthPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Rules checklist */}
      <div className="space-y-1">
        {passwordRules.map((rule, index) => {
          const passed = rule.test(password);
          return (
            <div 
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                passed ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {passed ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <X className="w-3 h-3 text-muted-foreground" />
              )}
              <span>{rule.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const isPasswordStrong = (password: string): boolean => {
  return passwordRules.every(rule => rule.test(password));
};