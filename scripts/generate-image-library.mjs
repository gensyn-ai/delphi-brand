import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const imagesReady = path.join(root, 'public/images/Images-ready');

const CATEGORIES = [
  'Creators',
  'Crypto',
  'Culture',
  'Economics',
  'General',
  'Politics',
  'Sports',
  'Tech',
  'Weather',
];

const EXCLUDE_FILES = new Set([
  'delphi-creator-01.png',
  'delphi-creator-02.png',
  'delphi-weather-01.png',
  'delphi-weather-03.png',
]);

const filesByCategory = Object.fromEntries(
  CATEGORIES.map((category) => {
    const dir = path.join(imagesReady, category);
    const files = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
          .filter((f) => !EXCLUDE_FILES.has(f))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      : [];
    return [category, files];
  }),
);

const out = `export const IMAGE_LIBRARY_CATEGORIES = ${JSON.stringify(CATEGORIES)} as const;

export type ImageLibraryCategory = (typeof IMAGE_LIBRARY_CATEGORIES)[number];

export interface ImageLibraryItem {
  category: ImageLibraryCategory;
  file: string;
}

export const IMAGE_LIBRARY_FILES: Record<ImageLibraryCategory, string[]> = ${JSON.stringify(filesByCategory, null, 2)} as const satisfies Record<ImageLibraryCategory, string[]>;

export const IMAGE_LIBRARY_ITEMS: ImageLibraryItem[] = IMAGE_LIBRARY_CATEGORIES.flatMap((category) =>
  IMAGE_LIBRARY_FILES[category].map((file) => ({ category, file })),
);

export const IMAGE_LIBRARY_POPULATED_CATEGORIES = IMAGE_LIBRARY_CATEGORIES.filter(
  (category) => IMAGE_LIBRARY_FILES[category].length > 0,
);

export function imageLibraryRelativePath(category: string, file: string): string {
  const folder = category.replace(/:/g, '-');
  return \`images/Images-ready/\${encodeURIComponent(folder)}/\${encodeURIComponent(file)}\`;
}

export function labelFromLibraryFilename(fileName: string): string {
  return fileName
    .replace(/\\.[^.]+$/, '')
    .replace(/^delphi-?/i, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
`;

fs.writeFileSync(path.join(root, 'src/data/image-library.ts'), out);
console.log('Wrote src/data/image-library.ts');
for (const category of CATEGORIES) {
  console.log(`  ${category}: ${filesByCategory[category].length}`);
}
