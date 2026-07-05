export const IMAGE_LIBRARY_CATEGORIES = ["Creators","Crypto","Culture","Economics","General","Politics","Sports","Tech","Weather"] as const;

export type ImageLibraryCategory = (typeof IMAGE_LIBRARY_CATEGORIES)[number];

export interface ImageLibraryItem {
  category: ImageLibraryCategory;
  file: string;
}

export const IMAGE_LIBRARY_FILES: Record<ImageLibraryCategory, string[]> = {
  "Creators": [],
  "Crypto": [
    "Crypto1.png",
    "Crypto2.png",
    "Crypto3.png",
    "Crypto4.png",
    "Crypto5.png",
    "Crypto6.png",
    "Crypto7.png",
    "Crypto8.png",
    "Crypto9.png",
    "Crypto10.png",
    "Crypto11.png",
    "Crypto12.png",
    "Crypto13.png"
  ],
  "Culture": [
    "Culture1_Pokemon.png",
    "Culture2_Pokemon.png",
    "Culture3_PS6.png",
    "Culture4_ps6.png",
    "Culture5_fALLOUT.png",
    "Culture6_Fallout.png",
    "Culture6.png",
    "Culture7_BoxofficeDune.png",
    "Culture8_DuneOfficeDune.png",
    "Culture9_Startrek.png",
    "Culture10_Gta.png",
    "Culture11_Gta.png",
    "Culture12_Gta.png",
    "Culture13_JediSuperhero.png",
    "Culture14_JediSuperhero.png",
    "Culture15_StarTrek.png"
  ],
  "Economics": [],
  "General": [],
  "Politics": [
    "Politics1.png",
    "Politics2.png",
    "Politics3.png",
    "Politics4.png",
    "Politics5.png",
    "Politics6.png",
    "Politics7.png",
    "Politics8.png",
    "Politics9.png",
    "Politics10.png",
    "Politics11.png",
    "Politics12.png",
    "Politics13.png",
    "Politics14.png",
    "Politics15.png",
    "Politics16.png",
    "Politics17.png",
    "Politics18.png",
    "Politics19.png",
    "Politics20.png",
    "Politics21.png",
    "Politics22.png",
    "Politics23.png",
    "Politics24.png",
    "Politics25.png",
    "Politics26.png",
    "Politics27.png",
    "Politics28.png",
    "Politics29.png",
    "Politics30.png",
    "Politics31.png",
    "Politics32.png",
    "Politics33.png",
    "Politics34.png"
  ],
  "Sports": [
    "Sport_1.png",
    "Sport_2.png",
    "Sport_3.png",
    "Sport_4.png",
    "Sport_5.png",
    "Sport_6.png",
    "Sport_7.png",
    "Sport_8.png",
    "Sport_9.png",
    "Sport_10.png",
    "Sport_11.png",
    "Sport_12.png",
    "Sport_13.png",
    "Sport_14.png",
    "Sport_15.png",
    "Sport_16.png",
    "Sport_17.png",
    "Sport_18.png",
    "Sport_19.png",
    "Sport_20.png",
    "Sport_21.png",
    "Sport_22.png",
    "Sport_23.png",
    "Sport_24.png",
    "Sport_25.png",
    "Sport_26.png",
    "Sport_27.png",
    "Sport_28.png"
  ],
  "Tech": [
    "Tech1.png",
    "Tech2.png",
    "Tech3.png",
    "Tech4.png",
    "Tech5.png",
    "Tech6.png",
    "Tech7.png",
    "Tech8.png",
    "Tech9.png",
    "Tech10.png",
    "Tech11.png",
    "Tech12.png",
    "Tech13.png",
    "Tech14.png",
    "Tech15.png",
    "Tech16.png",
    "Tech17.png",
    "Tech18.png",
    "Tech19.png",
    "Tech20.png",
    "Tech21.png",
    "Tech22.png",
    "Tech23.png",
    "Tech24.png",
    "Tech25.png",
    "Tech26.png",
    "Tech27.png",
    "Tech28.png",
    "Tech29.png",
    "Tech30.png",
    "Tech31.png",
    "Tech32.png",
    "Tech33.png",
    "Tech34.png",
    "Tech35.png",
    "Tech36.png",
    "Tech37.png",
    "Tech38.png"
  ],
  "Weather": []
} as const satisfies Record<ImageLibraryCategory, string[]>;

export const IMAGE_LIBRARY_ITEMS: ImageLibraryItem[] = IMAGE_LIBRARY_CATEGORIES.flatMap((category) =>
  IMAGE_LIBRARY_FILES[category].map((file) => ({ category, file })),
);

export const IMAGE_LIBRARY_POPULATED_CATEGORIES = IMAGE_LIBRARY_CATEGORIES.filter(
  (category) => IMAGE_LIBRARY_FILES[category].length > 0,
);

export function imageLibraryRelativePath(category: string, file: string): string {
  const folder = category.replace(/:/g, '-');
  return `images/Images-ready/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

export function labelFromLibraryFilename(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^delphi-?/i, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
