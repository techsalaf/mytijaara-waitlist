import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/settings/smtp")({
  component: () => (
    <SectionCard title="SMTP settings" description="How the app sends transactional and campaign emails" actions={<Badge className="bg-emerald-50 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" /> Connected</Badge>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Provider</Label>
          <Select defaultValue="postmark">
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="postmark">Postmark</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
              <SelectItem value="ses">Amazon SES</SelectItem>
              <SelectItem value="mailgun">Mailgun</SelectItem>
              <SelectItem value="custom">Custom SMTP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>From address</Label><Input defaultValue="hello@mytijaara.com" className="mt-1.5" /></div>
        <div><Label>From name</Label><Input defaultValue="MyTijaara" className="mt-1.5" /></div>
        <div><Label>Reply-to</Label><Input defaultValue="support@mytijaara.com" className="mt-1.5" /></div>
        <div><Label>SMTP host</Label><Input defaultValue="smtp.postmarkapp.com" className="mt-1.5" /></div>
        <div><Label>Port</Label><Input defaultValue="587" className="mt-1.5" /></div>
        <div><Label>Username</Label><Input defaultValue="••••••••" className="mt-1.5" /></div>
        <div><Label>Password / API key</Label><Input type="password" defaultValue="••••••••••••••••" className="mt-1.5" /></div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline">Send test email</Button>
      </div>
    </SectionCard>
  ),
});
