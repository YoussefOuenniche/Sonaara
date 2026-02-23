export interface GenreUmbrella {
  label: string;    // "Hip-Hop"
  value: string;    // "hip-hop"  (sent to pool filter)
  keywords: string[]; // Spotify micro-genre substrings that map here
}

export const GENRE_UMBRELLAS: GenreUmbrella[] = [
  { label: "Hip-Hop",     value: "hip-hop",     keywords: ["hip hop", "hip-hop", "rap", "trap", "drill", "grime", "bounce", "crunk", "cloud rap", "phonk"] },
  { label: "R&B",         value: "r&b",         keywords: ["r&b", "rnb", "rhythm and blues", "neo soul", "quiet storm", "new jack swing"] },
  { label: "Soul",        value: "soul",        keywords: ["soul", "motown", "deep soul", "funk soul"] },
  { label: "Pop",         value: "pop",         keywords: ["pop"] },
  { label: "Indie",       value: "indie",       keywords: ["indie", "lo-fi", "lo fi", "bedroom", "dream pop", "shoegaze", "slowcore", "chillwave", "noise pop", "jangle", "sadcore", "chamber pop"] },
  { label: "Alternative", value: "alternative", keywords: ["alternative", "alt-rock", "alt rock", "emo", "post-punk", "post-rock", "grunge", "math rock"] },
  { label: "Rock",        value: "rock",        keywords: ["rock"] },
  { label: "Metal",       value: "metal",       keywords: ["metal", "hardcore", "grindcore", "doom", "sludge", "deathcore", "black metal", "death metal"] },
  { label: "Electronic",  value: "electronic",  keywords: ["electronic", "electro", "edm", "synth", "vaporwave", "hypnagogic", "downtempo", "idm", "glitch"] },
  { label: "House",       value: "house",       keywords: ["house"] },
  { label: "Techno",      value: "techno",      keywords: ["techno", "industrial", "dark techno", "trance"] },
  { label: "Dance",       value: "dance",       keywords: ["dance", "dancehall", "club", "eurodance"] },
  { label: "Disco",       value: "disco",       keywords: ["disco", "funk", "boogie", "groove"] },
  { label: "Ambient",     value: "ambient",     keywords: ["ambient", "new age", "meditation", "drone", "dark ambient"] },
  { label: "Jazz",        value: "jazz",        keywords: ["jazz", "bebop", "swing", "bossa nova", "cool jazz", "fusion jazz", "smooth jazz"] },
  { label: "Blues",       value: "blues",       keywords: ["blues"] },
  { label: "Classical",   value: "classical",   keywords: ["classical", "orchestra", "symphon", "chamber", "opera", "baroque", "neoclassical", "contemporary classical"] },
  { label: "Folk",        value: "folk",        keywords: ["folk", "singer-songwriter", "americana", "bluegrass", "acoustic", "country folk", "appalachian"] },
  { label: "Country",     value: "country",     keywords: ["country", "nashville", "outlaw country", "bro-country", "texas country"] },
  { label: "Latin",       value: "latin",       keywords: ["latin", "reggaeton", "salsa", "cumbia", "bachata", "mpb", "sertanejo", "dembow", "corrido", "mariachi", "tango"] },
  { label: "Afrobeats",   value: "afrobeats",   keywords: ["afro", "amapiano", "naija", "highlife", "juju music"] },
  { label: "Reggae",      value: "reggae",      keywords: ["reggae", "dub", "ska", "roots reggae", "lover's rock"] },
  { label: "Gospel",      value: "gospel",      keywords: ["gospel", "christian", "worship", "ccm", "praise"] },
  { label: "Punk",        value: "punk",        keywords: ["punk"] },
  { label: "K-Pop",       value: "k-pop",       keywords: ["k-pop", "kpop", "k pop", "korean pop"] },
];

/** Return all umbrella values that a raw Spotify genre string matches. */
export function mapToUmbrellas(rawGenre: string): string[] {
  const g = rawGenre.toLowerCase();
  return GENRE_UMBRELLAS
    .filter((u) => u.keywords.some((kw) => g.includes(kw)))
    .map((u) => u.value);
}

/** Return the keywords for a given umbrella value (for pool filtering). */
export function getUmbrellaKeywords(value: string): string[] {
  return GENRE_UMBRELLAS.find((u) => u.value === value)?.keywords ?? [value];
}
