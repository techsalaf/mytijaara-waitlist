import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/admin/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cmsApi, type Faq } from "@/lib/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/admin/cms/faqs")({
  component: Faqs,
});

function Faqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const refresh = async () => setFaqs((await cmsApi.faqs()).data);
  useEffect(() => {
    void refresh();
  }, []);
  const update = async (id: number, patch: Partial<Faq>) => {
    await cmsApi.updateFaq(id, patch);
    await refresh();
  };
  const add = async () => {
    await cmsApi.createFaq({ question: "New question", answer: "Add an answer", published: false });
    await refresh();
  };
  const remove = async (id: number) => {
    await cmsApi.removeFaq(id);
    await refresh();
  };
  return (
    <SectionCard
      title="Frequently asked questions"
      description="Drag to reorder. Toggle to show or hide."
      actions={
        <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => void add()}>
          <Plus className="mr-2 h-4 w-4" /> Add FAQ
        </Button>
      }
    >
      <Accordion type="multiple" className="space-y-2">
        {faqs.map((f) => (
          <AccordionItem
            key={f.id}
            value={String(f.id)}
            className="rounded-xl border border-border/60 px-3 [&[data-state=open]]:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <AccordionTrigger className="flex-1 py-3 text-left text-sm font-medium hover:no-underline">
                {f.question}
              </AccordionTrigger>
              <Switch
                checked={f.published}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={(published) => void update(f.id, { published })}
              />
            </div>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Question</Label>
                <Input
                  defaultValue={f.question}
                  onBlur={(event) => void update(f.id, { question: event.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Answer</Label>
                <Textarea
                  rows={3}
                  defaultValue={f.answer}
                  onBlur={(event) => void update(f.id, { answer: event.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => void remove(f.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionCard>
  );
}
