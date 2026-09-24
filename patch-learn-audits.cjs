const fs = require('fs');

let learn = fs.readFileSync('src/components/LearnTab.jsx', 'utf8');
learn = learn.replace('onAddBook={handleAddBook}', 'onAddBook={handleAddBook}\n  onOpenJarvis={onOpenJarvis}');
learn = learn.replace('export default function LearnTab({ t, books, learnings, onUpdatePages, onFinishBook, onAddLearning, onAddBook, onStartBook }) {', "import { ContextualJarvisCTA } from './ui/Buttons.jsx';\nimport { MagicWand } from '@phosphor-icons/react';\nexport default function LearnTab({ t, books, learnings, onUpdatePages, onFinishBook, onAddLearning, onAddBook, onStartBook, onOpenJarvis }) {");
learn = learn.replace(
  '        {totalCount > 0 && (',
  `        <div style={{ marginTop: '0.5rem' }}>
          <ContextualJarvisCTA 
            label="Explore my knowledge"
            contextIcon={<MagicWand size={18} weight="fill" />}
            onClick={() => onOpenJarvis && onOpenJarvis({ page: 'learn' })}
          />
        </div>
        {totalCount > 0 && (`
);
fs.writeFileSync('src/components/LearnTab.jsx', learn);

let audits = fs.readFileSync('src/components/AuditsTab.jsx', 'utf8');
audits = audits.replace('export default function AuditsTab({ t }) {', "import { ContextualJarvisCTA } from './ui/Buttons.jsx';\nimport { MagicWand } from '@phosphor-icons/react';\nexport default function AuditsTab({ t, onOpenJarvis }) {");
audits = audits.replace(
  `          <div style={{ fontSize: '1.45rem', fontWeight: 900, lineHeight: 1 }}>
            Monthly Reviews
          </div>
        </div>`,
  `          <div style={{ fontSize: '1.45rem', fontWeight: 900, lineHeight: 1, marginBottom: '0.5rem' }}>
            Monthly Reviews
          </div>
          <ContextualJarvisCTA 
            label="Ask about audits"
            contextIcon={<MagicWand size={18} weight="fill" />}
            onClick={() => onOpenJarvis && onOpenJarvis({ page: 'audits' })}
          />
        </div>`
);
fs.writeFileSync('src/components/AuditsTab.jsx', audits);

let app = fs.readFileSync('src/App.jsx', 'utf8');
app = app.replace('<AuditsTab t={t} />', '<AuditsTab t={t} onOpenJarvis={handleOpenJarvis} />');
app = app.replace('onStartBook={handleStartBook}', 'onStartBook={handleStartBook}\n                onOpenJarvis={handleOpenJarvis}');
fs.writeFileSync('src/App.jsx', app);

console.log('Done learning and audits');
