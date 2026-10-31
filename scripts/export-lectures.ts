import { writeFileSync } from "fs";
import { lectures, Lecture, LectureBlock } from "../lib/lectures";

function toBlocks(l: Lecture): LectureBlock[] {
  if (l.blocks?.length) return l.blocks.filter((b) => b.type !== "image" || b.has);

  const b: LectureBlock[] = [];
  const H = (text: string) => b.push({ type: "heading", text });
  const T = (text?: string, o: { align?: "center" | "justify" | "left"; bold?: boolean } = {}) => {
    if (text && text.trim()) b.push({ type: "text", text, ...o });
  };
  const I = (src?: string, has?: boolean, width: "sm" | "md" | "lg" | "full" = "md", alt = "") => {
    if (src && has) b.push({ type: "image", src, has: true, width, alt });
  };
  const pair = (en?: string, zh?: string) =>
    l.bilingualOrder === "en-first"
      ? [en, zh]
      : [zh, en];

  if (l.posterImage) {
    T(l.titleZh, { bold: true });
    T(l.title);
    I(l.posterImage, l.hasPosterImage, "full", l.title);
    (l.posterLines ?? []).forEach((line) => T(line, { align: "left" }));
    return b;
  }

  if (l.overviewEn || l.aboutLectureBioEn) {
    T(l.title, { bold: true });
    T(l.titleZh);
    T(l.titleMetaLines);
    H("About the lecture / 讲座概览");
    T(l.speakerSectionLabel, { align: "left", bold: true });
    I(l.aboutLecturePhoto, l.hasAboutLecturePhoto, "lg", l.speakerName);
    T(l.speaker1CaptionName, { bold: true });
    T(l.speaker1CaptionAffiliation);
    T(l.speakerCaption);
    if (l.aboutLectureBioLines) T(l.aboutLectureBioLines, { align: "left" });
    else pair(l.aboutLectureBioEn, l.aboutLectureBioZh).forEach((t) => T(t, { align: "justify" }));
    I(l.speaker2Photo, l.hasSpeaker2Photo, "lg", l.speaker2CaptionName || "Speaker");
    T(l.speaker2CaptionName, { bold: true });
    T(l.speaker2CaptionAffiliation);
    T(l.speaker2BioLines, { align: "left" });
    if (l.overviewEn || l.overviewZh) {
      H(l.overviewLabel || "Overview / 讲座预告");
      pair(l.overviewEn, l.overviewZh).forEach((t) => T(t, { align: "justify" }));
    }
    if (l.organizerName) {
      H("Organizer / 主办");
      I(l.organizerPhoto, l.hasOrganizerPhoto, "md", l.organizerName);
      if (l.organizerCaption) T(l.organizerCaption);
      else {
        T(l.organizerName, { bold: true });
        T([l.organizerRole, l.organizerInstitute, l.organizerAffiliation].filter(Boolean).join("\n"));
      }
    }
    if (l.zoomLink && l.zoomLink !== "#") T(`Zoom link: ${l.zoomLink}`, { align: "left" });
    if (l.attendanceHeading) H(l.attendanceHeading);
    T(l.attendanceLines);
    if (l.qrPosition !== "at-end") I(l.qrImage, l.hasQrImage, "md", "Zoom QR code");
    T(l.onlineMeetingLabel, { bold: true });
    T(l.bilingualMeetingId);
    T(l.bilingualPasscode);
    if (l.qrPosition === "at-end") I(l.qrImage, l.hasQrImage, "md", "Zoom QR code");
    return b;
  }

  // simple format
  H(l.title);
  T(l.description, { align: "justify" });
  H("About the Speaker");
  I(l.speakerPhoto, l.hasSpeakerPhoto, "md", l.speakerName);
  T(l.speakerBio, { align: "justify" });
  if (l.zoomMeetingId || l.passcode || l.date) {
    H("Attendance Info:");
    T(
      [
        l.zoomMeetingId && `Zoom Meeting ID: ${l.zoomMeetingId}`,
        l.passcode && `Passcode: ${l.passcode}`,
        l.date && `Date: ${l.date}`,
      ]
        .filter(Boolean)
        .join("\n"),
      { align: "left" }
    );
  }
  return b;
}

const q = (s?: string | null) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
const n = lectures.length;
let sql = "-- Generated from lib/lectures.ts\nbegin;\n";

lectures.forEach((l, i) => {
  const slug = l.slug.replace(/\s+/g, "-"); // "session 10" mein space tha
  const blocks = JSON.stringify(toBlocks(l)).replace(/'/g, "''");
  sql += `
insert into public.lectures
  (slug, title, card_title, list_title, hero_title, hero_subtitle, speaker_name,
   card_image, hero_image, blocks, status, registration_open, sort_order)
values (${q(slug)}, ${q(l.title)}, ${q(l.cardTitle)}, ${q(l.listTitle || l.cardTitle)},
  ${q(l.heroTitle || l.title)}, ${q(l.heroSubtitle || l.speakerName)}, ${q(l.speakerName)},
  ${q(l.hasCardImage ? l.cardImage : null)}, ${q(l.hasHeroImage ? l.heroImage : null)},
  '${blocks}'::jsonb, 'past', false, ${n - i})
on conflict (slug) do update set
  title = excluded.title, card_title = excluded.card_title, list_title = excluded.list_title,
  hero_title = excluded.hero_title, hero_subtitle = excluded.hero_subtitle,
  speaker_name = excluded.speaker_name, card_image = excluded.card_image,
  hero_image = excluded.hero_image, blocks = excluded.blocks,
  status = excluded.status, registration_open = excluded.registration_open,
  sort_order = excluded.sort_order;
`;
});

sql += `
update public.lectures set lecture_date = '2026-10-27', date_text = '27 October 2026'
  where slug = 'paul-baker-14';

insert into public.lectures
  (slug, title, card_title, list_title, hero_title, hero_subtitle, speaker_name,
   blocks, status, registration_open, lecture_date, date_text, slider_cta, sort_order)
values ('elizabeth-hanks-15',
  'Designing and evaluating a corpus of conversation: lessons learned',
  'CISMA Lecture Series 15: Elizabeth Hanks',
  'CISMA Lecture Series 15: Elizabeth Hanks',
  'CISMA Lecture Series 15', 'Dr. Elizabeth Hanks', 'Dr. Elizabeth Hanks',
  '[{"type":"heading","text":"Designing and evaluating a corpus of conversation: lessons learned"},{"type":"heading","text":"Date and platform"},{"type":"text","text":"17 November 2026\\nOnline"}]'::jsonb,
  'upcoming', true, '2026-11-17', '17 November 2026', 'Register now', ${n + 1})
on conflict (slug) do nothing;

commit;
`;

writeFileSync("import-lectures.sql", sql);
console.log(`Done: ${n} lectures + elizabeth-hanks-15 -> import-lectures.sql`);