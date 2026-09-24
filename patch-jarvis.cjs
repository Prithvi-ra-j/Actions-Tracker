const fs = require('fs');
let content = fs.readFileSync('src/components/JarvisTab.jsx', 'utf8');

const target1 = `export default function JarvisTab({ t, onQuestsChanged, onboardingMode = false, onOnboardingComplete }) {`;
const replacement1 = `export default function JarvisTab({ t, onQuestsChanged, onboardingMode = false, onOnboardingComplete, jarvisContext, onClearContext }) {`;
content = content.replace(target1, replacement1);

const target2 = `      const response = await chatWithJarvis(llmUserText, history, modificationContext);`;
const replacement2 = `      const contextForEngine = modificationContext || jarvisContext;
      const response = await chatWithJarvis(llmUserText, history, contextForEngine);
      if (onClearContext && jarvisContext) onClearContext();`;
content = content.replace(target2, replacement2);

const target3 = `        {modificationContext && (`;
const replacement3 = `        {jarvisContext && !modificationContext && (
          <div className="jarvis-modifying">
            <div className="jarvis-modifying-label">
              Context attached: {jarvisContext.page} {jarvisContext.entityType ? \`- \${jarvisContext.entityType}\` : ''}
            </div>
            <button
              className="jarvis-cancel-modifying"
              onClick={() => onClearContext && onClearContext()}
              aria-label="Clear context"
            >
              ×
            </button>
          </div>
        )}

        {modificationContext && (`;
content = content.replace(target3, replacement3);

fs.writeFileSync('src/components/JarvisTab.jsx', content);
console.log('Done JarvisTab');
