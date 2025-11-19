import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientPrivacyPolicy() {
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>NannyGold Privacy Notice</CardTitle>
            <p className="text-sm text-muted-foreground">Last Updated: 01 October 2025</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold text-primary">1. Introduction</h3>
              <p className="text-sm">
                NannyGold ("we," "us," or "our") respects your privacy and is committed to protecting your personal information in compliance with South Africa's Protection of Personal Information Act ("POPIA"). This Privacy Notice explains how we collect, use, and protect your personal information when you visit our website or use our mobile application ("Platform").
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">2. Information We Collect</h3>
              <p className="text-sm mb-3">
                We collect personal information that you provide directly to us, such as:
              </p>
              <ul className="text-sm space-y-2 ml-6 list-disc">
                <li>Name, contact details (email, phone number, address)</li>
                <li>Identification details (ID number, date of birth)</li>
                <li>Payment and billing information</li>
                <li>Background and verification data</li>
                <li>Usage data including IP addresses, cookies, and browsing behavior on our Platform</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">3. How We Use Your Information</h3>
              <p className="text-sm mb-3">
                Your information is used to:
              </p>
              <ul className="text-sm space-y-2 ml-6 list-disc">
                <li>Provide and improve our childcare matching services</li>
                <li>Communicate with you regarding your use of our Platform and services</li>
                <li>Verify identities and conduct necessary screenings</li>
                <li>Process payments and manage your account</li>
                <li>Comply with legal obligations and protect our rights</li>
                <li>Send you marketing and promotional materials (only if you consent)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">4. Sharing and Disclosure</h3>
              <p className="text-sm">
                We do not sell your personal data. We may share your information with trusted third parties who assist in operating the Platform, all subject to confidentiality and security commitments.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">5. Data Retention</h3>
              <p className="text-sm">
                We retain your data only as long as necessary to provide our services and comply with legal requirements.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">6. Your Rights</h3>
              <p className="text-sm mb-3">
                Under POPIA, you have the right to:
              </p>
              <ul className="text-sm space-y-2 ml-6 list-disc">
                <li>Access your personal data</li>
                <li>Request correction or deletion of information</li>
                <li>Object to certain kinds of data processing</li>
                <li>Lodge a complaint with the Information Regulator</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">7. Data Security</h3>
              <p className="text-sm">
                We are committed to protecting your personal information in accordance with the Protection of Personal Information Act, 2013 (POPIA). We implement comprehensive technical, administrative, and organizational safeguards designed to protect your personal data from unauthorized access, disclosure, alteration, destruction, or loss. These measures include encryption, secure servers, access controls, regular security assessments, and employee training to ensure the confidentiality, integrity, and availability of your data. Despite these measures, no system can be completely secure, and you acknowledge the inherent risks in transmitting information online.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">8. Cookies and Tracking</h3>
              <p className="text-sm">
                Our Platform may utilize cookies, web beacons, and similar tracking technologies to enhance user experience, analyze usage patterns, personalize content, and improve our services. We collect data on how users interact with our Platform to optimize functionality and security. You are empowered to control and manage your cookie preferences through your browser settings or device controls, including opting out of certain cookies. Please note that disabling essential cookies may impact your ability to access certain features or use the Platform fully.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-primary">9. Contact Us</h3>
              <p className="text-sm mb-3">
                You have the right to inquire about, access, correct, or request deletion of your personal information processed by NannyGold, as provided under POPIA. For any privacy-related concerns, to exercise your data protection rights, or for more information about our privacy practices, please contact our Information Officer at:
              </p>
              <div className="bg-muted p-4 rounded-md text-sm space-y-2">
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <a href="mailto:care@nannygold.co.za" className="text-primary hover:underline">
                    care@nannygold.co.za
                  </a>
                </p>
                <p>
                  <span className="font-medium">Telephone:</span>{' '}
                  <a href="tel:+27662733942" className="text-primary hover:underline">
                    +27 66 273 3942
                  </a>
                </p>
              </div>
              <p className="text-sm mt-3">
                We strive to respond promptly and transparently to all privacy inquiries in accordance with POPIA requirements.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}