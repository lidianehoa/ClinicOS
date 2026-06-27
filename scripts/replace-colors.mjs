import fs from 'fs';
import path from 'path';

const dir = './src';

const replacements = [
  // Stone to Slate (neutral base)
  { regex: /bg-stone-/g, replacement: 'bg-slate-' },
  { regex: /text-stone-/g, replacement: 'text-slate-' },
  { regex: /border-stone-/g, replacement: 'border-slate-' },
  
  // Violet (Primary CRM) to Teal
  { regex: /bg-violet-500/g, replacement: 'bg-teal-500' },
  { regex: /bg-violet-600/g, replacement: 'bg-teal-600' },
  { regex: /text-violet-500/g, replacement: 'text-teal-500' },
  { regex: /text-violet-400/g, replacement: 'text-teal-400' },
  { regex: /text-violet-300/g, replacement: 'text-teal-300' },
  { regex: /border-violet-500/g, replacement: 'border-teal-500' },
  { regex: /ring-violet-500/g, replacement: 'ring-teal-500' },
  { regex: /focus:border-violet-500/g, replacement: 'focus:border-teal-500' },
  { regex: /focus:ring-violet-500/g, replacement: 'focus:ring-teal-500' },
  
  // Sky (Medical Portal) to Teal
  { regex: /bg-sky-500/g, replacement: 'bg-teal-500' },
  { regex: /bg-sky-600/g, replacement: 'bg-teal-600' },
  { regex: /text-sky-500/g, replacement: 'text-teal-500' },
  { regex: /text-sky-400/g, replacement: 'text-teal-400' },
  { regex: /text-sky-300/g, replacement: 'text-teal-300' },
  { regex: /border-sky-500/g, replacement: 'border-teal-500' },
  { regex: /ring-sky-500/g, replacement: 'ring-teal-500' },
  { regex: /focus:border-sky-500/g, replacement: 'focus:border-teal-500' },
  { regex: /focus:ring-sky-500/g, replacement: 'focus:ring-teal-500' },
  
  // Blue (Legacy) to Teal
  { regex: /bg-blue-600/g, replacement: 'bg-teal-600' },
  { regex: /bg-blue-500/g, replacement: 'bg-teal-500' },
  { regex: /text-blue-600/g, replacement: 'text-teal-600' },
  { regex: /text-blue-500/g, replacement: 'text-teal-500' },
  { regex: /border-blue-600/g, replacement: 'border-teal-600' },
  { regex: /border-blue-500/g, replacement: 'border-teal-500' },
  { regex: /focus:border-blue-500/g, replacement: 'focus:border-teal-500' },
  { regex: /focus:ring-blue-500/g, replacement: 'focus:ring-teal-500' },
];

function walk(directory) {
  let results = [];
  const list = fs.readdirSync(directory);
  list.forEach(file => {
    file = path.join(directory, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(dir);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  replacements.forEach(({ regex, replacement }) => {
    newContent = newContent.replace(regex, replacement);
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
    console.log(`Updated: ${file}`);
  }
});

console.log(`\nFinished! Changed ${changedFiles} files.`);
