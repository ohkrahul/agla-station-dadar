/**
 * The playlist (playbook §6.1).
 *
 * Every ID here has passed `npm run check:songs`, which confirms via oEmbed that
 * the video exists, permits embedding, and carries the title we expect — the last
 * part catches a plausible-looking ID that points at some other song. What it
 * cannot check is region restriction, which varies by viewer.
 *
 * There are no placeholder rows. An entry that cannot play is worse than no
 * entry, so a song without a verified ID does not go in.
 *
 * Songs carry more than one bucket where they belong to more than one, which is
 * what keeps the filters from being one or two tracks each.
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
  // ── 90s Local ───────────────────────────────────────────────────────────
  {
    title: "Pehla Nasha",
    artist: "Udit Narayan, Sadhana Sargam",
    year: 1992,
    youtubeId: "ZYotlBxpM3Q", // Saregama Music
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
    title: "Yaaron",
    artist: "KK",
    year: 1999,
    youtubeId: "LCfvYo3ILG0",
    buckets: ["90s", "last-local"],
  },

  // ── 2000s Kid ───────────────────────────────────────────────────────────
  {
    title: "Tum Se Hi",
    artist: "Mohit Chauhan",
    year: 2007,
    youtubeId: "mt9xg0mmt28", // T-Series
    buckets: ["2000s", "monsoon", "last-local"],
  },
  {
    title: "Iktara",
    artist: "Kavita Seth, Amit Trivedi",
    year: 2009,
    youtubeId: "fSS_R91Nimw", // SonyMusicIndiaVEVO
    buckets: ["2000s", "last-local"],
  },
  {
    title: "Chand Sifarish",
    artist: "Shaan, Kailash Kher",
    year: 2006,
    youtubeId: "zWEOx7TSM6I", // YRF
    buckets: ["2000s"],
  },
  {
    title: "Barso Re",
    artist: "Shreya Ghoshal",
    year: 2007,
    youtubeId: "asw-wTDzGUQ",
    buckets: ["2000s", "monsoon"],
  },

  // ── Mumbai Monsoon ──────────────────────────────────────────────────────
  {
    // Filmed walking through actual monsoon Mumbai. The definitive one.
    title: "Rimjhim Gire Sawan",
    artist: "Kishore Kumar",
    year: 1979,
    youtubeId: "JQoSSJDZxOo",
    buckets: ["monsoon"],
  },
  {
    // The female version from the same film, and just as well known.
    title: "Rimjhim Gire Sawan",
    artist: "Lata Mangeshkar",
    year: 1979,
    youtubeId: "6C7R_CUJgHQ",
    buckets: ["monsoon"],
  },

  // ── Last Local ──────────────────────────────────────────────────────────
  {
    title: "Kabira",
    artist: "Rekha Bhardwaj, Tochi Raina",
    year: 2013,
    youtubeId: "jHNNMj5bNQw", // T-Series
    buckets: ["last-local"],
  },
  {
    title: "Ilahi",
    artist: "Arijit Singh",
    year: 2013,
    youtubeId: "fdubeMFwuGs",
    buckets: ["last-local", "2000s"],
  },
  {
    title: "Tum Ho",
    artist: "Mohit Chauhan",
    year: 2011,
    youtubeId: "gkCKTuR-ECI", // T-Series
    buckets: ["last-local"],
  },
  {
    title: "Agar Tum Saath Ho",
    artist: "Alka Yagnik, Arijit Singh",
    year: 2015,
    youtubeId: "FOA9iyxsW_A", // T-Series
    buckets: ["last-local"],
  },
  {
    title: "Channa Mereya",
    artist: "Arijit Singh",
    year: 2016,
    youtubeId: "284Ov7ysmfA",
    buckets: ["last-local"],
  },

  // ── Later additions, filed by era ───────────────────────────────────────
  {
    title: "Kuchh Na Kaho",
    artist: "Kumar Sanu",
    year: 1994,
    youtubeId: "Kidtrrn4aUM", // Saregama
    buckets: ["90s"],
  },
  {
    title: "Yeh Kaali Kaali Aankhen",
    artist: "Kumar Sanu, Anu Malik",
    year: 1993,
    // Ishtar Music, the label that owns Baazigar. The first candidate played but
    // sat on a personal channel, which is the kind that quietly disappears.
    youtubeId: "IhKXq5dhTag",
    buckets: ["90s"],
  },
  {
    title: "Kabhi Kabhi Aditi",
    artist: "Rashid Ali",
    year: 2008,
    youtubeId: "HIbzXaBdwZw",
    buckets: ["2000s"],
  },
  {
    title: "Bheegi Bheegi",
    artist: "James",
    year: 2006,
    youtubeId: "WeY9hdsmIaQ",
    buckets: ["2000s", "monsoon"],
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
