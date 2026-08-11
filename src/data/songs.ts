/**
 * The playlist (playbook §6.1). No database, no YouTube Data API — curated IDs
 * played through one visible IFrame player.
 *
 * Deliberately small: six tracks, every one of them verified playable. An entry
 * that cannot play is worse than no entry, so there are no placeholders here.
 *
 * `buckets` are PLAYLIST groupings and are deliberately not the same axis as the
 * visual MoodId in data/moods.ts. "monsoon" appears in both and means different
 * things: here a rainy-reflective song, there what is out the window.
 *
 * Verify with `npm run check:songs` — it confirms via oEmbed that each video
 * exists, permits embedding, and carries the title we expect. It cannot check
 * region restriction, which varies per viewer.
 */
export type SongBucket = "90s" | "2000s" | "monsoon" | "last-local";

export type Song = {
  title: string;
  artist: string;
  year: number;
  youtubeId: string;
  buckets: SongBucket[];
};

export const songs: Song[] = [
  {
    title: "Pehla Nasha",
    artist: "Udit Narayan, Sadhana Sargam",
    year: 1992,
    // Saregama Music — the rights holder, not a reupload (§6).
    youtubeId: "ZYotlBxpM3Q",
    buckets: ["90s", "monsoon"],
  },
  {
    title: "Tujhe Dekha To",
    artist: "Kumar Sanu, Lata Mangeshkar",
    year: 1995,
    youtubeId: "cNV5hLSa9H8", // YRF
    buckets: ["90s"],
  },
  {
    // Filmed walking through actual monsoon Mumbai. The definitive one.
    title: "Rimjhim Gire Sawan",
    artist: "Kishore Kumar",
    year: 1979,
    youtubeId: "JQoSSJDZxOo",
    buckets: ["monsoon"],
  },
  {
    title: "Tum Se Hi",
    artist: "Mohit Chauhan",
    year: 2007,
    youtubeId: "mt9xg0mmt28", // T-Series
    buckets: ["2000s", "monsoon"],
  },
  {
    title: "Iktara",
    artist: "Kavita Seth, Amit Trivedi",
    year: 2009,
    youtubeId: "fSS_R91Nimw", // SonyMusicIndiaVEVO
    buckets: ["2000s"],
  },
  {
    title: "Kabira",
    artist: "Rekha Bhardwaj, Tochi Raina",
    year: 2013,
    youtubeId: "jHNNMj5bNQw", // T-Series
    buckets: ["last-local"],
  },
];

/** Everything here is playable; kept as a named export so the player's contract
 *  does not change if placeholder entries are ever reintroduced. */
export const playable = songs.filter((s) => s.youtubeId !== "");

export const bucketLabels: Record<SongBucket, string> = {
  "90s": "90s Local",
  "2000s": "2000s Kid",
  monsoon: "Mumbai Monsoon",
  "last-local": "Last Local",
};
