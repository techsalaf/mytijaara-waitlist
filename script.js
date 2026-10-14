const fs = require('fs');
let content = fs.readFileSync('src/routes/download.tsx', 'utf-8');

const downloadModalRegex = /export function DownloadModal\(\{\s*open,\s*onOpenChange,\s*onHelpClick\s*\}\:\s*DownloadModalProps\)\s*\{/g;
if (!downloadModalRegex.test(content)) {
    console.error('Could not find DownloadModal');
    process.exit(1);
}

// Add state to DownloadModal
content = content.replace(
    /export function DownloadModal\(\{\s*open,\s*onOpenChange,\s*onHelpClick\s*\}\:\s*DownloadModalProps\)\s*\{/,
    \export function DownloadModal({ open, onOpenChange, onHelpClick }: DownloadModalProps) {
  const [guideOpen, setGuideOpen] = useState(false);\
);

// Find the return of DownloadModal
content = content.replace(
    /return \(\s*<Dialog open=\{open\} onOpenChange=\{onOpenChange\}>/,
    \eturn (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>\
);

const endOfModal = \            </button>
          </div>
        </DialogContent>
      </Dialog>\;
const replacementEndOfModal = \            </button>
          </div>
        </DialogContent>
      </Dialog>
      
      <InstallGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </>\;

if (content.includes(endOfModal)) {
    content = content.replace(endOfModal, replacementEndOfModal);
} else {
    console.error('Could not find end of DownloadModal');
    process.exit(1);
}

const microFooterNote = \{/* Micro Footer Note */}\;
const replacementMicroFooterNote = \
          <div className="mt-2 text-center">
            <button 
              onClick={() => {
                onOpenChange(false);
                setGuideOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-full cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" />
              Installation Guide / Tips
            </button>
         </div>
         {/* Micro Footer Note */}\;

content = content.replace(microFooterNote, replacementMicroFooterNote);

const installGuideModalCode = \
export interface InstallGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallGuideModal({ open, onOpenChange }: InstallGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
            <Info className="h-6 w-6" />
          </div>
          <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Installation Guide
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Follow these steps to safely install the MyTijaara APK on your Android device.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</div>
            <p className="text-sm text-foreground"><span className="font-bold">Download</span> the app using the buttons on the previous screen.</p>
          </div>
          
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">2</div>
            <p className="text-sm text-foreground"><span className="font-bold">Open the file:</span> Tap the downloaded <code className="bg-muted px-1 py-0.5 rounded text-xs">.apk</code> file from your notifications or your Downloads folder.</p>
          </div>

          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</div>
            <p className="text-sm text-foreground"><span className="font-bold">Allow Unknown Sources:</span> If prompted, tap <strong>Settings</strong> and turn on <strong>"Allow from this source"</strong>.</p>
          </div>
          
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">4</div>
            <p className="text-sm text-foreground"><span className="font-bold">Bypass Play Protect:</span> If Google Play Protect shows a warning, tap <strong>"More details"</strong> and select <strong>"Install anyway"</strong>.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95 cursor-pointer"
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
\;

content = content.replace(/export interface DownloadModalProps/, installGuideModalCode + '\nexport interface DownloadModalProps');

if (!content.includes('Info,')) {
    content = content.replace(/import \{([^}]+)\}\s*from\s*"lucide-react"/, 'import { Info,  } from "lucide-react"');
}

fs.writeFileSync('src/routes/download.tsx', content);
console.log('Updated download.tsx');
