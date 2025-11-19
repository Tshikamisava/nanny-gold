import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@/contexts/BookingContext";
import { ArrowLeft, ArrowRight, Heart, Lock } from "lucide-react";
import { usePreferenceSync } from "@/hooks/usePreferenceSync";
import { Badge } from "@/components/ui/badge";

const NannyPreferences = () => {
  const navigate = useNavigate();
  const {
    preferences,
    updatePreferences
  } = useBooking();
  
  // Enhanced preference handling with immediate sync
  const { updateCookingPreference, isUpdating } = usePreferenceSync();
  const experienceLevels = [{
    value: '1-3',
    label: '1-3 years'
  }, {
    value: '3-6',
    label: '3-6 years'
  }, {
    value: '6+',
    label: '6+ years'
  }];
  const handleSubmit = () => {
    console.log("Nanny preferences:", preferences);
    navigate('/trust-verification');
  };
  const updatePreference = async (field: string, value: string | boolean | string[]) => {
    // Handle cooking preference with immediate UI feedback and auto-sync
    if (field === 'cooking' && typeof value === 'boolean') {
      console.log('🍳 Handling cooking preference update:', value);
      
      // Immediate UI update for responsiveness
      updatePreferences({ [field]: value });
      
      // Background sync to database and profile settings
      await updateCookingPreference(value, (confirmedValue) => {
        // Ensure UI state matches confirmed database value
        updatePreferences({ [field]: confirmedValue });
      });
      return;
    }
    
    // Handle other preferences normally
    updatePreferences({
      [field]: value
    });
  };
  return <div className="min-h-screen bg-background px-6 py-8">
      <div className="max-w-sm mx-auto">
        {/* Progress indicator only */}
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-primary/30 rounded-full"></div>
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
            <div className="w-2 h-2 bg-muted rounded-full"></div>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-secondary/10 rounded-full flex items-center justify-center border-2 border-secondary/20">
            <Heart className="w-10 h-10 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Desired Support
          </h1>
          <p className="text-muted-foreground">
            Tell us what you need from your Nanny
          </p>
        </div>

        <Card className="rounded-xl royal-shadow border-border">
          <CardContent className="space-y-6 p-6">
            

            <div>
              <label className="text-base font-medium text-foreground mb-2 block">
                Support Areas
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Which of these areas are important for your home or children?
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                (Select all that apply)
              </p>
              
              {/* Childcare Support */}
              <div className="mb-6">
                <h4 className="text-base font-medium text-foreground mb-3">Childcare Support</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="infant-care" checked={preferences.childcareSupport?.includes('infant-care') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'infant-care'] : current.filter(v => v !== 'infant-care');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="infant-care" className="text-sm text-foreground">
                      Infant care
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="toddler-stimulation" checked={preferences.childcareSupport?.includes('toddler-stimulation') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'toddler-stimulation'] : current.filter(v => v !== 'toddler-stimulation');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="toddler-stimulation" className="text-sm text-foreground">
                      Toddler stimulation & play
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="potty-training" checked={preferences.childcareSupport?.includes('potty-training') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'potty-training'] : current.filter(v => v !== 'potty-training');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="potty-training" className="text-sm text-foreground">
                      Potty training
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="homework-supervision" checked={preferences.childcareSupport?.includes('homework-supervision') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'homework-supervision'] : current.filter(v => v !== 'homework-supervision');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="homework-supervision" className="text-sm text-foreground">
                      Homework supervision
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="school-prep" checked={preferences.childcareSupport?.includes('school-prep') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'school-prep'] : current.filter(v => v !== 'school-prep');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="school-prep" className="text-sm text-foreground">
                      Prep kids for school / playdates / extra-curricular activities (dressing, bags, meals)
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="school-transport" checked={preferences.childcareSupport?.includes('school-transport') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'school-transport'] : current.filter(v => v !== 'school-transport');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="school-transport" className="text-sm text-foreground">
                      Walking kids to/from school
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="lunch-prep" checked={preferences.childcareSupport?.includes('lunch-prep') || false} onChange={e => {
                    const current = preferences.childcareSupport || [];
                    const updated = e.target.checked ? [...current, 'lunch-prep'] : current.filter(v => v !== 'lunch-prep');
                    updatePreference('childcareSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="lunch-prep" className="text-sm text-foreground">
                      School lunch preparation
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Add-on Services */}
              <div className="mb-6">
                <h4 className="text-base font-medium text-foreground mb-3">Add-on Services</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Switch 
                        id="cooking" 
                        checked={preferences.cooking || false} 
                        onCheckedChange={(checked) => updatePreference('cooking', checked)}
                        disabled={isUpdating}
                      />
                      {isUpdating && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <label htmlFor="cooking" className="text-sm text-foreground font-medium">
                      Cooking Support
                      {isUpdating && <span className="ml-1 text-xs text-muted-foreground">(updating...)</span>}
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-3">
                    <div className="flex items-center space-x-3">
                      <Switch 
                        id="driving-support" 
                        checked={false} 
                        disabled={true}
                        className="opacity-50"
                      />
                      <label htmlFor="driving-support" className="text-sm text-foreground font-medium">
                        Driving Support
                      </label>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <Lock className="w-3 h-3 mr-1" />
                      Coming Soon
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Switch 
                      id="special-needs" 
                      checked={preferences.specialNeeds || false} 
                      onCheckedChange={(checked) => updatePreference('specialNeeds', checked)}
                    />
                    <label htmlFor="special-needs" className="text-sm text-foreground font-medium">
                      Diverse Ability Support
                    </label>
                  </div>
                </div>
              </div>

              {/* Household Support */}
              <div className="mb-6">
                <h4 className="text-base font-medium text-foreground mb-3">Household Support</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="light-housekeeping" checked={preferences.householdSupport?.includes('light-housekeeping') || false} onChange={e => {
                    const current = preferences.householdSupport || [];
                    const updated = e.target.checked ? [...current, 'light-housekeeping'] : current.filter(v => v !== 'light-housekeeping');
                    updatePreference('householdSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="light-housekeeping" className="text-sm text-foreground">
                      Light housekeeping (light cleaning, laundry, ironing)
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="grocery-shopping" checked={preferences.householdSupport?.includes('grocery-shopping') || false} onChange={e => {
                    const current = preferences.householdSupport || [];
                    const updated = e.target.checked ? [...current, 'grocery-shopping'] : current.filter(v => v !== 'grocery-shopping');
                    updatePreference('householdSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="grocery-shopping" className="text-sm text-foreground">
                      Grocery shopping
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="errands" checked={preferences.householdSupport?.includes('errands') || false} onChange={e => {
                    const current = preferences.householdSupport || [];
                    const updated = e.target.checked ? [...current, 'errands'] : current.filter(v => v !== 'errands');
                    updatePreference('householdSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="errands" className="text-sm text-foreground">
                      Running errands
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="plant-care" checked={preferences.householdSupport?.includes('plant-care') || false} onChange={e => {
                    const current = preferences.householdSupport || [];
                    const updated = e.target.checked ? [...current, 'plant-care'] : current.filter(v => v !== 'plant-care');
                    updatePreference('householdSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="plant-care" className="text-sm text-foreground">
                      Plant care
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" id="admin-tasks" checked={preferences.householdSupport?.includes('admin-tasks') || false} onChange={e => {
                    const current = preferences.householdSupport || [];
                    const updated = e.target.checked ? [...current, 'admin-tasks'] : current.filter(v => v !== 'admin-tasks');
                    updatePreference('householdSupport', updated);
                  }} className="w-4 h-4 text-primary border-primary/20 rounded focus:ring-primary/20" />
                    <label htmlFor="admin-tasks" className="text-sm text-foreground">
                      Admin/phone tasks for the household
                    </label>
                  </div>
                </div>
              </div>
              
            </div>

            <div>
              <label className="text-base font-medium text-foreground mb-2 block">
                Other Important Requests
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                Anything else specific you'd like your nanny to support with?
              </p>
              <textarea placeholder="" value={preferences.additionalNeeds || ''} onChange={e => updatePreference('additionalNeeds', e.target.value)} className="w-full p-3 border border-primary/20 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none" rows={3} />
            </div>
            
            <Button onClick={handleSubmit} className="w-full royal-gradient hover:opacity-90 text-white py-3 rounded-xl font-semibold border-2 border-primary/20 shadow-lg">
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default NannyPreferences;