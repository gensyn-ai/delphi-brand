import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const libraryRoot = path.join(root, 'public/images/library');

/** Display category → source folder under public/images/library/ */
const GENERATOR_SOURCE_FOLDERS = {
  Politics: 'Politics Original',
  Tech: 'Tech Original',
  Sports: 'Sports Originals',
  Culture: 'Culture Original',
  Crypto: 'Crypto Original',
  Miscellaneous: 'Miscellaneous Original',
};

const CATEGORIES = Object.keys(GENERATOR_SOURCE_FOLDERS);

const filesByCategory = Object.fromEntries(
  CATEGORIES.map((category) => {
    const folder = GENERATOR_SOURCE_FOLDERS[category];
    const dir = path.join(libraryRoot, folder);
    const files = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      : [];
    return [category, { folder, files }];
  }),
);

const folderEntries = Object.fromEntries(
  CATEGORIES.map((category) => [category, filesByCategory[category].folder]),
);

const fileEntries = Object.fromEntries(
  CATEGORIES.map((category) => [category, filesByCategory[category].files]),
);

const out = `export const GENERATOR_LIBRARY_CATEGORIES = ${JSON.stringify(CATEGORIES)} as const;

export type GeneratorLibraryCategory = (typeof GENERATOR_LIBRARY_CATEGORIES)[number];

export interface GeneratorLibraryItem {
  category: GeneratorLibraryCategory;
  file: string;
}

/** Source folders under public/images/library/ (not Images-ready). */
export const GENERATOR_LIBRARY_SOURCE_FOLDERS: Record<GeneratorLibraryCategory, string> = ${JSON.stringify(folderEntries, null, 2)} as const;

export const GENERATOR_LIBRARY_FILES: Record<GeneratorLibraryCategory, string[]> = ${JSON.stringify(fileEntries, null, 2)} as const satisfies Record<GeneratorLibraryCategory, string[]>;

export const GENERATOR_LIBRARY_ITEMS: GeneratorLibraryItem[] = GENERATOR_LIBRARY_CATEGORIES.flatMap((category) =>
  GENERATOR_LIBRARY_FILES[category].map((file) => ({ category, file })),
);

export const GENERATOR_LIBRARY_POPULATED_CATEGORIES = GENERATOR_LIBRARY_CATEGORIES.filter(
  (category) => GENERATOR_LIBRARY_FILES[category].length > 0,
);

export function generatorLibraryRelativePath(category: GeneratorLibraryCategory, file: string): string {
  const folder = GENERATOR_LIBRARY_SOURCE_FOLDERS[category];
  return \`images/library/\${encodeURIComponent(folder)}/\${encodeURIComponent(file)}\`;
}
`;

fs.writeFileSync(path.join(root, 'src/data/generator-library.ts'), out);
console.log('Wrote src/data/generator-library.ts');
for (const category of CATEGORIES) {
  console.log(`  ${category}: ${fileEntries[category].length}`);
}
