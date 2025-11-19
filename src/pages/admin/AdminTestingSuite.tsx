import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ComprehensiveTestingSuite from '@/components/ComprehensiveTestingSuite';
import Phase1AdminTester from '@/components/Phase1AdminTester';
import Phase2NannyTester from '@/components/Phase2NannyTester';
import Phase3ClientTester from '@/components/Phase3ClientTester';
import Phase4CrossTenantTester from '@/components/Phase4CrossTenantTester';
import { Phase5AuthConfigTester } from '@/components/Phase5AuthConfigTester';
import { Phase6DeploymentChecker } from '@/components/Phase6DeploymentChecker';
import { FinalPreDay3Checklist } from '@/components/FinalPreDay3Checklist';
import Phase7BookingFlowTester from '@/components/Phase7BookingFlowTester';
import PlacementFeeValidator from '@/components/PlacementFeeValidator';

export default function AdminTestingSuite() {
  return (
    <div className="p-6">
      <Tabs defaultValue="phase1" className="w-full">
        <div className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
            <TabsTrigger value="phase1" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 1</div>
                <div className="text-xs opacity-75">Admin</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="phase2" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 2</div>
                <div className="text-xs opacity-75">Nanny</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="phase3" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 3</div>
                <div className="text-xs opacity-75">Client</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="phase4" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 4</div>
                <div className="text-xs opacity-75">Cross-Tenant</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="phase5" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 5</div>
                <div className="text-xs opacity-75">Auth Config</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="phase6" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 6</div>
                <div className="text-xs opacity-75">Deployment</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="phase7" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Phase 7</div>
                <div className="text-xs opacity-75">Booking Flows</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs lg:text-sm px-2 py-3">
              <div className="text-center">
                <div className="font-medium">Final</div>
                <div className="text-xs opacity-75">Checklist</div>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="phase1">
          <Phase1AdminTester />
        </TabsContent>
        <TabsContent value="phase2">
          <Phase2NannyTester />
        </TabsContent>
        <TabsContent value="phase3">
          <Phase3ClientTester />
        </TabsContent>
        <TabsContent value="phase4">
          <Phase4CrossTenantTester />
        </TabsContent>

        <TabsContent value="phase5">
          <Phase5AuthConfigTester />
        </TabsContent>

        <TabsContent value="phase6">
          <Phase6DeploymentChecker />
        </TabsContent>

        <TabsContent value="phase7">
          <div className="space-y-6">
            <Phase7BookingFlowTester />
            <PlacementFeeValidator />
          </div>
        </TabsContent>

        <TabsContent value="checklist">
          <FinalPreDay3Checklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}