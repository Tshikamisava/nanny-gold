import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

interface AddressSuggestion {
  id: string;
  title: string;
  address: {
    label: string;
    houseNumber?: string;
    street?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    countryName?: string;
    postalCode?: string;
  };
  position: {
    lat: number;
    lng: number;
  };
}

export const AddressAutocomplete = ({ value, onChange, placeholder = "Enter your address", className }: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const selectedByClickRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  const formatAddressLine = (suggestion: AddressSuggestion): string => {
    const { address } = suggestion;
    const parts: string[] = [];
    
    // Add house number and street
    if (address.houseNumber && address.street) {
      parts.push(`${address.houseNumber} ${address.street}`);
    } else if (address.street) {
      parts.push(address.street);
    } else {
      // Fallback to title if no detailed address
      return suggestion.title;
    }

    return parts.length > 0 ? parts.join(', ') : suggestion.title;
  };

  const formatAddressSubline = (suggestion: AddressSuggestion): string => {
    const { address } = suggestion;
    const parts: string[] = [];
    
    // Add district/suburb
    if (address.district) {
      parts.push(address.district);
    }
    
    // Add city
    if (address.city && address.city !== address.district) {
      parts.push(address.city);
    }

    return parts.join(', ');
  };

  const formatFullAddress = (suggestion: AddressSuggestion): string => {
    // Use the full label from HERE API which includes all address components
    // This ensures we get: Number, Street, Suburb, City, Postal Code, Country
    return suggestion.address.label || suggestion.title;
  };

  const prioritizeResults = (results: AddressSuggestion[]): AddressSuggestion[] => {
    return results.sort((a, b) => {
      // Prefer results with house numbers
      const aHasNumber = !!a.address?.houseNumber;
      const bHasNumber = !!b.address?.houseNumber;
      
      if (aHasNumber && !bHasNumber) return -1;
      if (!aHasNumber && bHasNumber) return 1;
      
      // Prefer results with more detailed addresses
      const aDetailScore = [a.address?.street, a.address?.district, a.address?.city].filter(Boolean).length;
      const bDetailScore = [b.address?.street, b.address?.district, b.address?.city].filter(Boolean).length;
      
      return bDetailScore - aDetailScore;
    });
  };

  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Abort any in-flight request for snappy UX
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);
    try {
      const response = await fetch('https://msawldkygbsipjmjuyue.supabase.co/functions/v1/here-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, proximity: userCoords || undefined }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Silently ignore short-query (400) or rate-limit (429) or aborted cases
        if (response.status === 400 || response.status === 429) {
          setSuggestions([]);
          return;
        }
        throw new Error(`Failed to fetch addresses (${response.status})`);
      }

      const data = await response.json();
      
      if (data.items && Array.isArray(data.items)) {
        const formattedSuggestions: AddressSuggestion[] = data.items.map((item: any, index: number) => ({
          id: item.id || `suggestion-${index}`,
          title: item.title || item.address?.label || 'Unknown location',
          address: {
            label: item.address?.label || item.title || '',
            houseNumber: item.address?.houseNumber,
            street: item.address?.street,
            district: item.address?.district,
            city: item.address?.city,
            county: item.address?.county,
            state: item.address?.state || item.address?.stateCode,
            countryName: item.address?.countryName,
            postalCode: item.address?.postalCode
          },
          position: item.position || { lat: 0, lng: 0 }
        }));
        
        const prioritizedResults = prioritizeResults(formattedSuggestions);
        setSuggestions(prioritizedResults.slice(0, 8));
      } else {
        setSuggestions([]);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('Error fetching addresses:', error);
      setSuggestions([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch address suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAddress = async (text: string) => {
    try {
      const response = await fetch('https://msawldkygbsipjmjuyue.supabase.co/functions/v1/here-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolveText: text, proximity: userCoords || undefined })
      });
      if (!response.ok) return;
      const data = await response.json();
      const first = data.items?.[0];
      if (first) {
        const label = first.address?.label || first.title;
        const coords = first.position ? { lat: first.position.lat, lng: first.position.lng } : undefined;
        onChange(label, coords);
        if (coords) {
          toast({ title: 'Address resolved', description: `Coordinates: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` });
        }
      }
    } catch (e) {
      console.warn('Address resolve failed', e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      searchAddresses(newValue);
      setShowSuggestions(true);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    selectedByClickRef.current = true;
    // Use the complete address label that includes all components
    const selectedAddress = suggestion.address.label || suggestion.title;
    const coordinates = suggestion.position && suggestion.position.lat !== 0 && suggestion.position.lng !== 0 
      ? { lat: suggestion.position.lat, lng: suggestion.position.lng }
      : undefined;
    
    onChange(selectedAddress, coordinates);
    setSuggestions([]);
    setShowSuggestions(false);
    
    if (inputRef.current) {
      inputRef.current.blur();
    }
    
    // Show success toast with geocoding info
    if (coordinates) {
      toast({
        title: "Address Selected",
        description: `Location coordinates obtained: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
      });
    } else {
      toast({
        title: "Address Selected",
        description: "Address saved successfully",
      });
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for clicks and attempt resolve
    setTimeout(() => {
      setShowSuggestions(false);
      if (!selectedByClickRef.current) {
        const text = inputRef.current?.value?.trim() || '';
        if (text.length >= 3) {
          resolveAddress(text);
        }
      }
      selectedByClickRef.current = false;
    }, 200);
  };

  useEffect(() => {
    // Get user geolocation (optional, improves relevance)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(null),
        { enableHighAccuracy: false, timeout: 3000 }
      );
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={className}
      />
      
      {showSuggestions && (isLoading || suggestions.length > 0) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-background border shadow-lg">
          {isLoading ? (
            <div className="px-4 py-3 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching addresses...
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0 transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground leading-5">
                      {formatAddressLine(suggestion)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatAddressSubline(suggestion) || suggestion.address.label}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
};