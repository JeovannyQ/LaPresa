const fs = require('fs');
const path = require('path');
const dir = path.join('src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = {
  'bg-zinc-50': 'bg-black',
  'bg-white/95': 'bg-black/95',
  'bg-white': 'bg-zinc-950',
  'text-zinc-900': 'text-amber-50',
  'text-zinc-800': 'text-amber-100',
  'text-zinc-700': 'text-amber-200/70',
  'text-zinc-600': 'text-amber-200/50',
  'text-zinc-500': 'text-amber-200/40',
  'border-zinc-200': 'border-white/10',
  'border-zinc-300': 'border-white/20',
  'bg-zinc-100': 'bg-white/5',
  'hover:bg-zinc-100': 'hover:bg-white/10',
  'hover:bg-zinc-50': 'hover:bg-white/5',
  'shadow-lg': 'shadow-2xl shadow-black/50',
  'shadow-sm': 'shadow-sm shadow-black/50',
  'shadow-md': 'shadow-md shadow-black/50'
};

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const [oldClass, newClass] of Object.entries(replacements)) {
    // Replace with word boundaries to avoid partial matches
    // But CSS classes can have special characters like / and - so we split by spaces/quotes
    const regex = new RegExp('(?<=[\'\"\\s])' + oldClass.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&') + '(?=[\'\"\\s])', 'g');
    content = content.replace(regex, newClass);
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + file);
});
