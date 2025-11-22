import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Home, Check } from "lucide-react";

export default function EmbedCode() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [embedType, setEmbedType] = useState<"inline" | "modal" | "button">("button");

  const getHostname = () => {
    return window.location.origin;
  };

  const embedScripts = {
    button: `<!-- Clinic Appointment Booking Button -->
<script>
  (function() {
    const bookingUrl = '${getHostname()}';
    const btn = document.createElement('button');
    btn.textContent = 'Book Appointment';
    btn.style.cssText = 'padding: 12px 24px; background-color: #0097C2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500; transition: background-color 0.2s;';
    btn.onmouseover = () => btn.style.backgroundColor = '#006E91';
    btn.onmouseout = () => btn.style.backgroundColor = '#0097C2';
    btn.onclick = () => window.open(bookingUrl, '_blank', 'width=600,height=800');
    document.currentScript.parentElement.appendChild(btn);
  })();
</script>`,

    modal: `<!-- Clinic Appointment Booking Modal -->
<script>
  (function() {
    const bookingUrl = '${getHostname()}';
    const style = document.createElement('style');
    style.textContent = \`
      .clinic-booking-modal { display: none; position: fixed; z-index: 9999; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4); }
      .clinic-booking-modal.active { display: flex; }
      .clinic-booking-content { background-color: white; margin: auto; border-radius: 8px; width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .clinic-booking-close { float: right; font-size: 28px; font-weight: bold; cursor: pointer; padding: 10px 20px; }
      .clinic-booking-close:hover { color: red; }
    \`;
    document.head.appendChild(style);
    
    const modal = document.createElement('div');
    modal.className = 'clinic-booking-modal';
    modal.innerHTML = '<div class="clinic-booking-content"><span class="clinic-booking-close">&times;</span><iframe src="' + bookingUrl + '" style="width:100%; height:100%; border:none;"></iframe></div>';
    document.body.appendChild(modal);
    
    const btn = document.createElement('button');
    btn.textContent = 'Book Appointment';
    btn.style.cssText = 'padding: 12px 24px; background-color: #0097C2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;';
    btn.onclick = () => modal.classList.add('active');
    
    modal.querySelector('.clinic-booking-close').onclick = () => modal.classList.remove('active');
    modal.onclick = (e) => { if(e.target === modal) modal.classList.remove('active'); };
    
    document.currentScript.parentElement.appendChild(btn);
  })();
</script>`,

    inline: `<!-- Clinic Appointment Booking Inline -->
<iframe src="${getHostname()}" style="width: 100%; height: 800px; border: none; border-radius: 8px;"></iframe>`,
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Embed Booking Widget</h1>
              <p className="text-sm text-muted-foreground">
                Add our booking form to your website
              </p>
            </div>
            <Button
              onClick={() => navigate("/admin/dashboard")}
              variant="outline"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Button Embed */}
          <Card className="border-2 cursor-pointer hover:border-primary/50 transition" onClick={() => setEmbedType("button")}>
            <CardHeader>
              <CardTitle className="text-lg">Button Embed</CardTitle>
              <CardDescription>Opens booking in a new window</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Minimal integration - just add a button that opens the booking form.
                </p>
                <div className="p-4 bg-muted rounded">
                  <button className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition">
                    Book Appointment
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modal Embed */}
          <Card className="border-2 cursor-pointer hover:border-primary/50 transition" onClick={() => setEmbedType("modal")}>
            <CardHeader>
              <CardTitle className="text-lg">Modal Embed</CardTitle>
              <CardDescription>Opens in a popup on your site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  User stays on your site - booking form opens in a modal dialog.
                </p>
                <div className="p-4 bg-muted rounded border border-border">
                  <button className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition">
                    Book Appointment
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inline Embed */}
          <Card className="border-2 cursor-pointer hover:border-primary/50 transition" onClick={() => setEmbedType("inline")}>
            <CardHeader>
              <CardTitle className="text-lg">Inline Embed</CardTitle>
              <CardDescription>Embedded directly on page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Full integration - booking form displayed inline with your content.
                </p>
                <div className="p-3 bg-muted rounded border border-border h-32 flex items-center justify-center text-xs text-muted-foreground">
                  [Booking Form]
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Code Display */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Embed Code ({embedType.charAt(0).toUpperCase() + embedType.slice(1)})</CardTitle>
            <CardDescription>
              Copy and paste this code into your website's HTML
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs sm:text-sm font-mono">
                <code>{embedScripts[embedType]}</code>
              </pre>
              <Button
                onClick={() => handleCopy(embedScripts[embedType])}
                size="sm"
                className="absolute top-2 right-2 gap-2"
                variant="outline"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
              <strong>💡 Installation Instructions:</strong>
              <ol className="mt-2 space-y-1 ml-4 list-decimal">
                <li>Click "Copy Code" above</li>
                <li>Go to your website editor or HTML</li>
                <li>Paste the code where you want the booking widget to appear</li>
                <li>Save and publish your changes</li>
              </ol>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold text-foreground mb-2">Features:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Responsive design - works on mobile and desktop</li>
                <li>✓ Secure - all patient data encrypted</li>
                <li>✓ No coding required - just copy and paste</li>
                <li>✓ Auto-updates - always uses latest version</li>
                <li>✓ Cross-origin support - works on any website</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-900">
              <strong>⚠️ Note:</strong> Make sure to test the widget on your live website after embedding. 
              If the form doesn't load, check your browser's developer console for any errors.
            </div>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card className="border-2 mt-8">
          <CardHeader>
            <CardTitle>Advanced Integration</CardTitle>
            <CardDescription>For developers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">API Endpoints</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><code className="bg-muted px-2 py-1 rounded">GET /api/services</code> - List available services</li>
                <li><code className="bg-muted px-2 py-1 rounded">GET /api/providers</code> - List providers</li>
                <li><code className="bg-muted px-2 py-1 rounded">GET /api/slots</code> - Get available time slots</li>
                <li><code className="bg-muted px-2 py-1 rounded">POST /api/appointments</code> - Create appointment</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Custom CSS</h4>
              <p className="text-sm text-muted-foreground">
                You can customize the look and feel of the embedded widget by adding custom CSS to your website.
                The widget uses CSS classes that can be targeted with selectors like <code className="bg-muted px-2 py-1 rounded">.clinic-booking-modal</code>.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-900">
              <strong>✓ Support Available:</strong> Need help integrating? Contact our support team at support@clinic.com
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
