import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientTermsConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Terms & Conditions</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>NannyGold Client Terms and Conditions</CardTitle>
            <p className="text-sm text-muted-foreground">Effective Date: 01 October 2025</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
              <p>
                These Terms and Conditions ("Terms" or "Agreement") govern your use of the NannyGold mobile application, website, and related services (collectively, the "Platform"). By registering with, accessing, or using NannyGold Platform, you ("Client," "you," or "your") agree to be bound by these Terms.
              </p>
            </div>

            <section>
              <h3 className="text-lg font-semibold text-primary">1. Service Description</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">1.1</span> NannyGold is a trusted digital Platform that connects families, parents, and guardians with experienced, independent child and home care providers—known as "Nannies." Unlike traditional employment agencies, NannyGold combines the convenience of an online matchmaking Platform with active management designed to maintain high standards of care and professionalism.
                </p>
                <p>
                  <span className="font-medium">1.2</span> We rigorously interview, screen, and verify all Nannies, and continue to support their professional development through regular check-ins, ongoing training, and skill updates. This commitment ensures families access only the most reliable, knowledgeable, and up-to-date Nannies.
                </p>
                <p>
                  <span className="font-medium">1.3</span> While Nannies on our Platform operate as independent contractors providing direct child and homecare services to you, NannyGold manages key aspects of the Client-Nanny relationship. We set fair pricing structures that clients and nannies accept, and we maintain oversight of engagements to foster positive and transparent partnerships. If any issues arise, NannyGold acts as a mediator to resolve disputes promptly and fairly, supporting sustained trust and mutual satisfaction.
                </p>
                <p>
                  <span className="font-medium">1.4</span> With NannyGold, families are empowered to find trustworthy, skillful childcare professionals through a Platform that blends technological convenience, comprehensive vetting, professional development, price transparency, and proactive relationship management—offering peace of mind and quality care in every connection.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">2. Client Obligations</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">2.1 Supervision.</span> You are responsible for supervising the Nannies to an extent you deem appropriate and for ensuring a safe environment for childcare services.
                </p>
                <p>
                  <span className="font-medium">2.2 Insurance.</span> You must maintain adequate insurance coverage to protect against any potential property damage, personal injury, or other losses that may arise in connection with child and homecare services provided by a Nanny. NannyGold and the Nannies are indemnified against such liabilities.
                </p>
                <p>
                  <span className="font-medium">2.3 Placement Fee.</span> Clients acknowledge that a placement fee is clearly displayed on the NannyGold Platform prior to booking. This fee is a once-off payment payable upon the successful placement of a Nanny and is non-refundable under all circumstances. By proceeding with a booking, clients agree to this non-refundable placement fee as consideration for the sourcing, screening, and ongoing support services provided by NannyGold.
                </p>
                <p>
                  <span className="font-medium">2.4 Monthly Fee.</span> In addition to the placement fee, clients agree to pay any applicable monthly fees for continued use of the Platform and access to ongoing nanny services. Details of monthly fees, including amounts and payment schedule, are transparently displayed on the Platform and must be accepted by clients prior to confirmation of service. You agree to pay the service fees as set and communicated by NannyGold. Payment terms, including rates and scheduling, are established by NannyGold and agreed upon by both you and the Nannies. You are responsible for timely and full payment for childcare services rendered. Failure to meet payment obligations may result in suspension or termination of access to NannyGold's Platform.
                </p>
                <p>
                  <span className="font-medium">2.5 Payment Terms.</span> All fees set by NannyGold must be paid in full and in a timely manner as agreed on the Platform. Failure to satisfy payment obligations may result in suspension or termination of your access to NannyGold Platform.
                </p>
                <p>
                  <span className="font-medium">2.6 Communication.</span> You commit to maintaining open and respectful communication with the Nannies. NannyGold facilitates mediation in the event of disputes or issues to support resolution.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">3. Term and Duration of Service</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">3.1 Commencement.</span> The contract between you and the Nanny (via NannyGold) shall be deemed to commence on the date when you confirm and book the child and homecare service through the NannyGold Platform (the "Booking Confirmation Date").
                </p>
                <p>
                  <span className="font-medium">3.2 Term.</span> For child and homecare services booked on a short-term, daily, or hourly basis, the Term of service shall commence from the Booking Confirmation Date and conclude upon completion of the scheduled booking. Your obligations and any applicable fees will extend only for the duration of the specific booking. For ongoing child and homecare services contracted on a long-term basis, including monthly or multi-year engagements, the term shall commence on the Booking Confirmation Date shall continue indefinitely until either you or the Nanny terminates the service by providing written notice in accordance with the termination provisions set out in this agreement.
                </p>
                <p>
                  <span className="font-medium">3.3 Termination.</span> Either party (you or the nanny) may terminate a long-term service agreement by providing written notice as specified in the service agreement or Platform terms. Termination shall be effective upon expiry of the notice period or sooner if otherwise mutually agreed.
                </p>
                <p>
                  <span className="font-medium">3.4 Adjustments.</span> Any changes to the duration or scope of services shall be agreed upon by both you and the Nanny and recorded through the NannyGold Platform to ensure clarity and enforceability.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">4. Non-Circumvention</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">4.2</span> You acknowledge that NannyGold invests significant resources in sourcing, vetting, training, and managing Nannies featured on its Platform.
                </p>
                <p>
                  <span className="font-medium">4.3</span> To protect these efforts and ongoing business interests, you agree that during the Term of engagement with NannyGold and for a period of 12 months following the termination or conclusion of any services performed by a Nanny introduced through the NannyGold Platform, You shall not, directly or indirectly, employ, engage, solicit, or contract with the Nanny, or arrange for the Nanny's services, independently of NannyGold and without NannyGold's prior written consent.
                </p>
                <p>
                  <span className="font-medium">4.4</span> You agree that any attempt to circumvent NannyGold's involvement in the provision of child and homecare services, including bypassing the Platform to avoid payment of fees or circumvent commissions due to NannyGold, constitutes a material breach of this Agreement.
                </p>
                <p>
                  <span className="font-medium">4.5</span> In the event of such a breach, you shall be liable to pay NannyGold liquidated damages equivalent to twelve months of the monthly service fees payable to NannyGold immediately preceding the breach. This remedy shall be in addition to any other remedies available under law or equity.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">5. No Employment or Agency Relationship</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">5.1</span> Nothing in these Terms shall be construed as creating an employment, partnership, joint venture, or agency relationship between NannyGold and any Nanny or Client. Nannies operate as independent, self-employed contractors who provide childcare services directly to Clients.
                </p>
                <p>
                  <span className="font-medium">5.2</span> While NannyGold provides management support including ongoing training, check-ins, pricing control, and mediation services, it does not employ, control, or directly supervise Nannies in the manner of a traditional employer. NannyGold disclaims any liability for the acts, omissions, behavior, or negligence of Nannies.
                </p>
                <p>
                  <span className="font-medium">5.3</span> Clients engage Nannies directly through the NannyGold Platform and acknowledge that NannyGold acts solely as an intermediary providing the Platform, vetting, and management support services but does not assume legal responsibility for the child and homecare services rendered by Nannies.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">6. Limitation of Liability</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">6.1</span> To the fullest extent permitted by law, NannyGold, its affiliates, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, goodwill, data, or personal injury arising out of or in connection with the use of the NannyGold Platform or services.
                </p>
                <p>
                  <span className="font-medium">6.2</span> NannyGold provides the Platform and management support services "as is" and without any representation or warranty, express or implied, including but not limited to warranties of availability, reliability, accuracy, completeness, or fitness for any particular purpose. NannyGold does not warrant or guarantee the suitability, qualifications, performance, or conduct of any Nannies.
                </p>
                <p>
                  <span className="font-medium">6.3</span> You acknowledge that Nannies operate as independent contractors and that NannyGold is not liable for any acts, omissions, negligence, misconduct, or injuries caused by Nannies.
                </p>
                <p>
                  <span className="font-medium">6.4</span> To the maximum extent permitted by law, NannyGold's aggregate liability to you for any claim arising out of or related to these Terms or the services shall not exceed the total fees paid by you to NannyGold in the three (3) months preceding the claim.
                </p>
                <p>
                  <span className="font-medium">6.5</span> You agree to indemnify and hold harmless NannyGold against any claims, damages, liabilities, costs, or expenses arising from their engagement of Nannies or use of the Platform.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">7. Confidentiality</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">7.1</span> You acknowledge that, in the course of using the NannyGold Platform and services, you will have access to confidential and proprietary information belonging to NannyGold, including but not limited to business methods, pricing structures, operational processes, and Nanny data, and other non-public information ("Confidential Information").
                </p>
                <p>
                  <span className="font-medium">7.2</span> You agree to keep all such Confidential Information strictly confidential and shall not disclose, share, or use this information for any purpose other than to utilize the services provided by NannyGold.
                </p>
                <p>
                  <span className="font-medium">7.3</span> This confidentiality obligation shall remain in effect during the term of you engagement with NannyGold and shall survive termination or expiration of such engagement.
                </p>
                <p>
                  <span className="font-medium">7.4</span> You agree to take all reasonable measures to protect the confidentiality of NannyGold's Confidential Information and to promptly notify NannyGold if you become aware of any unauthorized use or disclosure.
                </p>
                <p>
                  <span className="font-medium">7.5</span> Unauthorized disclosure or misuse of NannyGold's Confidential Information may cause irreparable harm to NannyGold, entitling NannyGold to seek injunctive relief and any other remedies available under law or equity.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">8. Protection of Personal Information (POPIA Compliance)</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">8.1</span> NannyGold commits to complying with the Protection of Personal Information Act, 2013 ("POPIA") and all applicable data protection laws in collecting, processing, storing, and using personal information of Clients and Nannies.
                </p>
                <p>
                  <span className="font-medium">8.2</span> Personal information collected via the Platform shall be processed lawfully, in good faith, and in a manner that respects individuals' privacy rights, ensuring data is only used for purposes reasonably required to provide the childcare services and operate the Platform.
                </p>
                <p>
                  <span className="font-medium">8.3</span> NannyGold implements appropriate technical and organizational measures to protect personal information against unauthorized access, loss, damage, or disclosure.
                </p>
                <p>
                  <span className="font-medium">8.4</span> Clients and Nannies have rights under POPIA, including the right to be informed about how their data is used, to access their data, to correct inaccuracies, and to object to processing under certain circumstances.
                </p>
                <p>
                  <span className="font-medium">8.5</span> In the event of a data breach involving personal information, NannyGold shall comply with POPIA's notification requirements, informing affected individuals and the Information Regulator as soon as reasonably possible.
                </p>
                <p>
                  <span className="font-medium">8.6</span> By using the NannyGold Platform, Clients and Nannies consent to the collection, processing, and storage of their personal information as described in these Terms and NannyGold's Privacy Policy.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">9. Indemnification</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">9.1</span> You (the Client) agree to indemnify, defend, and hold harmless NannyGold, its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, liabilities, losses, costs, or expenses (including reasonable legal fees and costs) arising out of or related to:
                </p>
                <div className="ml-4 space-y-2">
                  <p>a) Your use of the NannyGold Platform;</p>
                  <p>b) Any child and homecare services or other services provided by a Nanny you engaged through NannyGold;</p>
                  <p>c) Any damage to property, loss, personal injury, or other harm resulting directly or indirectly from your engagement of a Nanny or use of the services facilitated through NannyGold.</p>
                </div>
                <p>
                  <span className="font-medium">9.2</span> This indemnification obligation shall survive the Term of your agreement with NannyGold.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">10. Booking, Payment, and Cancellation</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">10.1 Payment.</span> All payments for Nanny services must be made through the NannyGold Platform. You are not permitted to pay Nannies directly. NannyGold will reserve the monthly booking fee and deduct payments automatically from your nominated payment method in accordance with the agreed fee schedule.
                </p>
                <p>
                  <span className="font-medium">10.2 Cancellations and Modifications.</span> For short-term bookings (daily or hourly), you must cancel or modify your booking at least 24 hours before the scheduled start time through the NannyGold Platform. Failure to provide 24 hours' notice will result in a cancellation fee equivalent to the full booking amount for that session. For long-term bookings (monthly or longer), you must provide at least 30 days' written notice of cancellation or modification. Cancellation or modification requests must be submitted via the NannyGold Platform or by contacting NannyGold support at care@nannygold.co.za. In the event of cancellation within the required notice period, no cancellation fee will apply. Modifications to bookings are subject to availability and confirmation by NannyGold.
                </p>
                <p>
                  <span className="font-medium">10.3 Non-Payment.</span> Failure to pay any due fees may result in suspension or termination of the Client's access to the NannyGold Platform and services. NannyGold reserves the right to withhold or suspend services until outstanding payments are fully settled.
                </p>
                <p>
                  <span className="font-medium">10.4 Refunds.</span> Refunds, if any, will be processed in accordance with the timing and reason for cancellation as outlined above, less any applicable fees or charges stipulated by NannyGold.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">11. Dispute Resolution</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">11.1 Nanny Service Disputes:</span>
                </p>
                <div className="ml-4 space-y-2">
                  <p>a) For long-term service bookings, NannyGold offers a 90-day replacement guarantee starting from the booking confirmation date. If you are dissatisfied with the Nanny within this period, you may request a replacement Nanny at no additional placement fee, subject to availability.</p>
                  <p>b) For short-term service bookings (frequent daily or hourly bookings), you may request a replacement Nanny at least 24 hours before their next scheduled booking, subject to availability.</p>
                  <p>c) If you decline a replacement or if a replacement is unavailable, NannyGold may facilitate mediation between the Client and Nanny to resolve the issue amicably.</p>
                </div>
                <p>
                  <span className="font-medium">11.2 Disputes with NannyGold.</span> Any disagreement between you and NannyGold shall first be addressed through good-faith discussions. If unresolved, remedies shall be limited exclusively to:
                </p>
                <div className="ml-4 space-y-2">
                  <p>a) Credits applied to your profile; or</p>
                  <p>b) One (1) free hour of short-term support for future short-term bookings.</p>
                </div>
                <p>
                  <span className="font-medium">11.3</span> These remedies shall be the sole and exclusive remedies available to Clients.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">12. Referral Incentive</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">12.1</span> You will be eligible to receive a referral incentive equal to 20% of the placement fee paid by each new long-term service client whom you refer to NannyGold, provided that the referred client completes a long-term service booking on the Platform. This incentive is a one-time payment per successful referral.
                </p>
                <p>
                  <span className="font-medium">12.2</span> Referral incentives will be credited to your profile and reflected on your payment statements or account dashboard. This program is subject to NannyGold's verification and confirmation of the referral and successful booking.
                </p>
                <p>
                  <span className="font-medium">12.3</span> NannyGold reserves the right to amend or discontinue the referral program at any time with prior notice.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">13. General</h3>
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">13.1 Governing Law.</span> These Terms shall be governed by and construed in accordance with the laws of South Africa. You consent to the exclusive jurisdiction of the courts located within Johannesburg, Gauteng.
                </p>
                <p>
                  <span className="font-medium">13.2 Severability.</span> If any provision of these Terms is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.
                </p>
                <p>
                  <span className="font-medium">13.3 Entire Agreement.</span> These Terms constitute the entire agreement between you and NannyGold regarding the use of the Platform and supersede all prior agreements, understandings, or representations.
                </p>
                <p>
                  <span className="font-medium">13.4 Updates.</span> NannyGold reserves the right to modify these Terms at any time. Material changes will be communicated via the Platform or email. Continued use of the Platform signifies acceptance of any updated Terms.
                </p>
              </div>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-center text-sm text-muted-foreground">
                For questions about these terms, please contact our support team at{' '}
                <a href="mailto:care@nannygold.co.za" className="text-primary hover:underline">
                  care@nannygold.co.za
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}