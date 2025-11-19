import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Nanny = Tables<'nannies'>;
type NannyInsert = TablesInsert<'nannies'>;

interface MatchingPreferences {
  specialNeeds: boolean;
  ecdTraining: boolean;
  drivingSupport: boolean;
  cooking: boolean;
  montessori: boolean;
  location?: string;
  childrenAges?: string[];
  livingArrangement?: string;
}

// Helper function to count children (18 years and under)
const countChildren = (childrenAges: string[]): number => {
  return childrenAges.filter(age => {
    // Extract numeric value from age string
    const numericAge = parseFloat(age.match(/\d+(\.\d+)?/)?.[0] || '0');
    
    // Check if age is in months or years
    if (age.toLowerCase().includes('month')) {
      return numericAge <= 216; // 18 years = 216 months
    } else if (age.toLowerCase().includes('year')) {
      return numericAge <= 18;
    } else {
      // Assume years if no unit specified
      return numericAge <= 18;
    }
  }).length;
};

export const useNannies = () => {
  return useQuery({
    queryKey: ['nannies'],
    queryFn: async () => {
      console.log('🔍 Fetching real nanny data from Supabase');
      
      const { data, error } = await supabase
        .from('nannies')
        .select(`
          *,
          profiles(*),
          nanny_services(*),
          nanny_availability(*)
        `)
        .eq('approval_status', 'approved')
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching nannies:', error);
        throw new Error('Failed to fetch nannies from database');
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ No approved nannies found in database');
        return [];
      }
      
      console.log(`✅ Found ${data.length} real approved nannies`);
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
  });
};

// Helper function to check if nanny has a specific skill
const hasSkill = (skills: string[], skillToCheck: string): boolean => {
  if (!skills || !Array.isArray(skills)) return false;
  
  const normalizedSkills = skills.map(skill => skill.toLowerCase().trim());
  const patterns = {
    // Existing patterns
    cooking: ['cooking', 'food preparation', 'meal prep', 'culinary', 'baking'],
    driving: ['driving', 'driver', 'transport', 'car', 'driving license'],
    specialNeeds: ['diverse ability', 'diverseability', 'special needs', 'disability care', 'special care'],
    ecdTraining: ['ecd', 'early childhood development', 'child development'],
    montessori: ['montessori', 'educational', 'structured learning'],
    
    // NEW: Additional service patterns for consistent filtering
    petCare: ['pet care', 'pet savvy', 'pets', 'animal care', 'dog care', 'cat care'],
    lightHousekeeping: ['light housekeeping', 'housekeeping', 'cleaning', 'tidying', 'household duties'],
    errandRuns: ['errands', 'errand runs', 'shopping', 'grocery shopping', 'errands & shopping'],
    laundry: ['laundry', 'washing', 'ironing', 'clothes care'],
    mealPreparation: ['meal preparation', 'cooking', 'food prep', 'baking']
  };
  
  const relevantPatterns = patterns[skillToCheck as keyof typeof patterns] || [skillToCheck.toLowerCase()];
  
  return normalizedSkills.some(skill => 
    relevantPatterns.some(pattern => skill.includes(pattern))
  );
};

export const useMatchingNannies = (preferences: MatchingPreferences) => {
  return useQuery({
    queryKey: ['matching-nannies', preferences],
    queryFn: async () => {
      console.log('🔍 Getting matching nannies with preferences:', preferences);
      
      // First get nannies
      const { data: nannies, error: nanniesError } = await supabase
        .from('nannies')
        .select('*')
        .eq('approval_status', 'approved')
        .eq('is_available', true)
        .eq('can_receive_bookings', true);
      
      if (nanniesError) {
        console.error('❌ Error fetching nannies:', nanniesError);
        throw new Error('Failed to fetch nannies from database');
      }
      
      if (!nannies || nannies.length === 0) {
        console.log('⚠️ No approved nannies available for bookings');
        return [];
      }

      // Then get all related data for these nannies
      const nannyIds = nannies.map(n => n.id);
      
      const [profilesResult, servicesResult, availabilityResult] = await Promise.all([
        supabase.from('profiles').select('*').in('id', nannyIds),
        supabase.from('nanny_services').select('*').in('nanny_id', nannyIds),
        supabase.from('nanny_availability').select('*').in('nanny_id', nannyIds)
      ]);

      // Combine the data
      const realNannies = nannies.map(nanny => ({
        ...nanny,
        profiles: profilesResult.data?.find(p => p.id === nanny.id) || null,
        nanny_services: servicesResult.data?.find(s => s.nanny_id === nanny.id) || null,
        nanny_availability: availabilityResult.data?.filter(a => a.nanny_id === nanny.id) || []
      }));
      
      console.log(`✅ Found ${realNannies.length} real nannies with profiles, applying filters...`);
      console.log('📋 Filters being applied:', {
        livingArrangement: preferences.livingArrangement,
        cooking: preferences.cooking,
        driving: preferences.drivingSupport,
        specialNeeds: preferences.specialNeeds,
        ecdTraining: preferences.ecdTraining,
        montessori: preferences.montessori
      });
      
      // Filter real nannies based on preferences with comprehensive service-aware filtering
      let filteredNannies = realNannies.filter(nanny => {
        const serviceCategories = nanny.service_categories || [];
        
        // ========================================
        // 1. FILTER BY LIVING ARRANGEMENT (Long-Term)
        // ========================================
        if (preferences.livingArrangement) {
          // Normalize the living arrangement format (handle 'live-in' or 'live_in')
          const normalizedArrangement = preferences.livingArrangement.toLowerCase().replace('-', '_');
          
          if (normalizedArrangement === 'live_in') {
            // For live-in: ONLY show nannies who explicitly have 'live_in' capability
            if (!serviceCategories.includes('live_in')) {
              console.log(`Filtering out ${nanny.id}: No live_in capability`);
              return false;
            }
          }
          // For live-out: Show ALL nannies (default capability, no filtering needed)
        }
        
        // ========================================
        // 2. FILTER BY ADDITIONAL SERVICES
        // All filtering uses the SAME hasSkill() function with consistent patterns
        // ========================================
        
        // Cooking
        if (preferences.cooking && !hasSkill(nanny.skills, 'cooking')) {
          console.log(`Filtering out ${nanny.id}: No cooking skill`);
          return false;
        }
        
        // Driving Support
        if (preferences.drivingSupport && !hasSkill(nanny.skills, 'driving')) {
          console.log(`Filtering out ${nanny.id}: No driving skill`);
          return false;
        }
        
        // Special Needs Support
        if (preferences.specialNeeds && !hasSkill(nanny.skills, 'specialNeeds')) {
          console.log(`Filtering out ${nanny.id}: No special needs experience`);
          return false;
        }
        
        // ECD Training
        if (preferences.ecdTraining && !hasSkill(nanny.skills, 'ecdTraining')) {
          console.log(`Filtering out ${nanny.id}: No ECD training`);
          return false;
        }
        
        // Montessori
        if (preferences.montessori && !hasSkill(nanny.skills, 'montessori')) {
          console.log(`Filtering out ${nanny.id}: No Montessori training`);
          return false;
        }
        
        return true;
      });
      
      console.log(`🎯 After filtering: ${filteredNannies.length} matching nannies`);
      console.log('Applied filters:', {
        cooking: preferences.cooking,
        driving: preferences.drivingSupport,
        specialNeeds: preferences.specialNeeds,
        ecdTraining: preferences.ecdTraining,
        montessori: preferences.montessori
      });
      
    // Phase 6: Show all nannies if filtered results are less than 70% of available
    const minThreshold = Math.max(2, Math.floor(realNannies.length * 0.7));
    if (filteredNannies.length < minThreshold) {
      console.log(`🔄 Too few filtered matches (${filteredNannies.length} < ${minThreshold}), showing all approved nannies`);
      filteredNannies = realNannies;
    }
      
      console.log('✅ Returning matched nannies with complete data');
      console.log('📊 Final nanny data check:', filteredNannies.map(n => ({
        id: n.id,
        name: `${n.profiles?.first_name || 'NO NAME'} ${n.profiles?.last_name || ''}`,
        hasProfile: !!n.profiles,
        hasServices: !!n.nanny_services,
        rating: n.rating
      })));
      
      return filteredNannies;
    },
    enabled: !!preferences,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes for better UX
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
  });
};

export const useNannyProfile = (id: string) => {
  return useQuery({
    queryKey: ['nanny', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nannies')
        .select(`
          *,
          profiles(*),
          nanny_services(*),
          nanny_availability(*),
          reviews(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

export const useCreateNannyProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (nannyData: NannyInsert) => {
      const { data, error } = await supabase
        .from('nannies')
        .insert(nannyData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nannies'] });
    }
  });
};