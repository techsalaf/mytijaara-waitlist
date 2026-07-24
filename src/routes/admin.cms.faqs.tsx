import { createFileRoute } from "@tanstack/react-router";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { faqs } from "@/lib/mock-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/admin/cms/faqs")({
  component: () => (
    <SectionCard
      title="Frequently asked questions"
      description="Drag to reorder. Toggle to show or hide."
      actions={<Button size="sm" className="bg-[#0D7A46] hover:bg-[#166534]"><Plus className="mr-2 h-4 w-4" /> Add FAQ</Button>}
    >
      <Accordion type="multiple" className="space-y-2">
        {faqs.map((f) => (
          <AccordionItem key={f.id} value={String(f.id)} className="rounded-xl border border-border/60 px-3 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <AccordionTrigger className="flex-1 py-3 text-left text-sm font-medium hover:no-underline">
                {f.question}
              </AccordionTrigger>
              <Switch defaultChecked={f.published} onClick={(e) => e.stopPropagation()} />
            </div>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Question</Label>
                <Input defaultValue={f.question} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <Textarea rows={3} defaultValue={f.answer} className="mt-1" />
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-red-600"><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionCard>
  ),
});
