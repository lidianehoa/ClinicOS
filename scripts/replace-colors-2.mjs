import fs from 'fs';
import path from 'path';

const dir = './src';

const replacements = [
  // Sky to Teal
  { regex: /([a-z]+)-sky-([0-9]+)/g, replacement: '$1-teal-$2' },
  // Violet to Teal
  { regex: /([a-z]+)-violet-([0-9]+)/g, replacement: '$1-teal-$2' },
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
