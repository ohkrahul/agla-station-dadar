/**
 * Western Line, v1 route (playbook §1).
 *
 * A real Mumbai platform board carries three scripts stacked: Marathi, then
 * Hindi, then English. Mostly the two Devanagari lines are identical, which is
 * why Bandra is worth looking at twice — in Marathi it is वांद्रे, not बांद्रा.
 * That difference is the detail a Mumbaikar will notice first.
 *
 * Diacritics are worth a check by a Marathi reader before launch.
 */
export type Station = {
  id: string;
  english: string;
  marathi: string;
  hindi: string;
};

export const stations: Station[] = [
  { id: "churchgate", english: "Churchgate", marathi: "चर्चगेट", hindi: "चर्चगेट" },
  { id: "marine-lines", english: "Marine Lines", marathi: "मरीन लाइन्स", hindi: "मरीन लाइन्स" },
  { id: "charni-road", english: "Charni Road", marathi: "चर्नी रोड", hindi: "चर्नी रोड" },
  { id: "grant-road", english: "Grant Road", marathi: "ग्रँट रोड", hindi: "ग्रांट रोड" },
  { id: "mumbai-central", english: "Mumbai Central", marathi: "मुंबई सेंट्रल", hindi: "मुंबई सेंट्रल" },
  { id: "dadar", english: "Dadar", marathi: "दादर", hindi: "दादर" },
  { id: "bandra", english: "Bandra", marathi: "वांद्रे", hindi: "बांद्रा" },
  { id: "andheri", english: "Andheri", marathi: "अंधेरी", hindi: "अंधेरी" },
  { id: "borivali", english: "Borivali", marathi: "बोरिवली", hindi: "बोरिवली" },
  { id: "virar", english: "Virar", marathi: "विरार", hindi: "विरार" },
];

/** Shown on the line selector and the route rail footer. */
export const LINE_NAME = "Western Line";
export const origin = stations[0];
export const terminus = stations[stations.length - 1];

/**
 * Journey pacing. The real Churchgate–Borivali run is about an hour; a website
 * that nobody sits through is not nostalgic, it is just slow. These compress
 * the line to roughly eight minutes end to end.
 */
export const TRAVEL_SECONDS = 50;
export const DWELL_SECONDS = 12;
