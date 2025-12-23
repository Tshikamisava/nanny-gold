import { calculateHourlyPricing, calculateLongTermPricing } from './utils/pricingUtils';
import { SERVICE_PRICING } from './constants/servicePricing';

const verifyPricing = async () => {
    console.log("🚀 Verifying Pricing Structure");

    // 1. Short Term - Emergency
    console.log("\n--- S1: Short Term (Emergency) ---");
    const emergency = await calculateHourlyPricing('emergency', 6, { cooking: true }, ['2023-01-01']);
    console.log("Input: 6 Hours, Cooking");
    console.log("Base Rate (6h * R80):", emergency.baseRate); // 480
    console.log("Add-ons (Cooking R100):", emergency.addOns); // 100
    console.log("Service Fee (R35):", emergency.serviceFee); // 35
    console.log("Total:", emergency.total); // 615

    // 2. Short Term - Gap Coverage
    console.log("\n--- S2: Short Term (Gap Coverage) ---");
    // 5 Days (3 weekdays, 2 weekends)
    const dates = ['2023-01-02', '2023-01-03', '2023-01-04', '2023-01-07', '2023-01-08']; // M T W Sat Sun
    const gap = await calculateHourlyPricing('temporary_support', 0, {}, dates);
    console.log("Input: 5 Days (3 weekdays, 2 weekends)");
    console.log("Base Rate (3*280 + 2*350):", gap.baseRate); // 840 + 700 = 1540
    console.log("Service Fee (R2500):", gap.serviceFee); // 2500
    console.log("Total:", gap.total); // 4040

    // 3. Long Term - Standard (Family Hub)
    console.log("\n--- S3: Long Term (Family Hub) ---");
    const ltStandard = calculateLongTermPricing('family_hub', 'live_out', [], 0, { cooking: true });
    console.log("Input: Family Hub, Live Out, Cooking");
    console.log("Base Rate:", ltStandard.baseRate); // 6800
    console.log("Add-ons (Cooking R1500):", ltStandard.addOns); // 1500
    console.log("Placement Fee (Standard R2500):", ltStandard.placementFee); // 2500
    console.log("Monthly Total:", ltStandard.total); // 8300

    // 4. Long Term - Premium (Epic Estates)
    console.log("\n--- S4: Long Term (Epic Estates) ---");
    const ltPremium = calculateLongTermPricing('epic_estates', 'live_in', [], 0, {});
    console.log("Input: Epic Estates, Live In");
    console.log("Base Rate:", ltPremium.baseRate); // 10000
    console.log("Placement Fee (50%):", ltPremium.placementFee); // 5000
    console.log("Monthly Total:", ltPremium.total); // 10000
};

verifyPricing();
