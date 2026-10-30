import Link from "next/link";
import { notFound } from "next/navigation";
import { lectures, getLectureBySlug } from "@/lib/lectures";
import LectureRegistration from "@/components/LectureRegistration";

export function generateStaticParams() {
  return lectures.map((lecture) => ({ slug: lecture.slug }));
}

export default function LecturePage({ params }: { params: { slug: string } }) {
  const index = lectures.findIndex((l) => l.slug === params.slug);
  const lecture = getLectureBySlug(params.slug);

  if (!lecture) {
    notFound();
  }
  const l = lecture!;

  // Array is newest-first. "Previous" (older) is the next index; "Next" (newer) is the previous index.
  const prev = index < lectures.length - 1 ? lectures[index + 1] : null;
  const next = index > 0 ? lectures[index - 1] : null;

  // Which format this lecture uses is decided by which fields were filled in.
  const isBilingual = Boolean(l.overviewEn || l.aboutLectureBioEn);
  const isPoster = Boolean(l.posterImage);
  const hasBlocks = Boolean(l.blocks && l.blocks.length > 0);
const blockWidth = { sm: "w-36", md: "w-52", lg: "w-64", full: "w-full" } as const;

  return (
    <>
      {/* Hero banner */}
      <section className="relative w-full h-[380px] md:h-[440px] overflow-hidden bg-gray-700">
        {l.hasHeroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.heroImage}
            alt={l.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-16 pb-10 max-w-4xl">
          <h1 className="text-white text-2xl md:text-4xl font-extrabold leading-snug mb-3">
            {l.heroTitle || l.title}
          </h1>
          <p className={`text-white/90 text-lg ${l.heroSubtitle ? "italic" : ""}`}>
            {l.heroSubtitle || l.speakerName}
          </p>
          {l.registrationOpen && (
            <a
              href="#register"
              className="mt-5 inline-block self-start rounded-md bg-cisma-gold px-6 py-2.5 text-sm font-bold text-cisma-navy hover:opacity-90"
            >
              Register now
            </a>
          )}
        </div>
      </section>

      {/* Body */}
      <section className="w-full bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-gray-800">
        {hasBlocks ? (
          <div className="space-y-4">
            {l.blocks!.map((b, i) => {
              if (b.type === "heading") {
                return (
                  <h3 key={i} className="text-center font-bold text-gray-900 pt-6">
                    {b.text}
                  </h3>
                );
              }
              if (b.type === "text") {
                const align =
                  b.align === "justify"
                    ? "text-justify"
                    : b.align === "left"
                    ? "text-left"
                    : "text-center";
                return (
                  <p
                    key={i}
                    className={`${align} leading-relaxed whitespace-pre-line ${
                      b.bold ? "font-bold text-gray-900" : ""
                    }`}
                  >
                    {b.text}
                  </p>
                );
              }
              const w = blockWidth[b.width || "md"];
              return (
                <div key={i} className="flex justify-center py-2">
                  {b.has ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.src} alt={b.alt || ""} className={`${w} h-auto`} />
                  ) : (
                    <div
                      className={`${w} aspect-[4/5] bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3`}
                    >
                      Image not added — /public{b.src}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : isPoster ? (
            <>
              {l.titleZh && (
                <h2 className="text-xl md:text-2xl text-gray-800 mb-3">{l.titleZh}</h2>
              )}
              <p className="italic text-sm text-gray-700 mb-6">{l.title}</p>

              <div className="mb-8">
                {l.hasPosterImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.posterImage} alt={l.title} className="w-full h-auto" />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-4">
                    Poster image not added — place it at /public{l.posterImage}
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-800">
                {l.posterLines?.map((line, i) =>
                  line === "" ? (
                    <div key={i} className="h-6" />
                  ) : (
                    <p key={i} className="mb-4 leading-relaxed">
                      {line}
                    </p>
                  )
                )}
              </div>
            </>
          ) : isBilingual ? (
            <>
              {/* Bilingual title block */}
              <h2 className="text-xl md:text-2xl font-bold text-cisma-blue text-center mb-2">
                {l.title}
              </h2>
              {l.titleZh && (
                <p className="text-lg text-gray-800 text-center mb-10">{l.titleZh}</p>
              )}
              {l.titleMetaLines && (
                <p className="text-center text-sm text-gray-700 mb-10 whitespace-pre-line">
                  {l.titleMetaLines}
                </p>
              )}

              {/* About the lecture */}
              <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
                About the lecture / 讲座概览
              </h3>
              {l.speakerSectionLabel && (
                <p className="font-semibold text-gray-900 mb-4">{l.speakerSectionLabel}</p>
              )}
              <div className="flex justify-center mb-4">
                {l.hasAboutLecturePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.aboutLecturePhoto}
                    alt={l.speakerName}
                    className="w-64 h-auto object-cover"
                  />
                ) : (
                  <div className="w-64 aspect-[4/5] bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3">
                    Speaker photo not added — /public{l.aboutLecturePhoto}
                  </div>
                )}
              </div>
              {l.speaker1CaptionName && (
                <div className="text-center mb-6">
                  <p className="font-bold text-gray-900">{l.speaker1CaptionName}</p>
                  {l.speaker1CaptionAffiliation && (
                    <p className="text-gray-700">{l.speaker1CaptionAffiliation}</p>
                  )}
                </div>
              )}
              {l.speakerCaption && (
                <p className="text-center text-sm text-gray-700 mb-8 whitespace-pre-line">
                  {l.speakerCaption}
                </p>
              )}
              {l.aboutLectureBioLines ? (
                <p className="leading-relaxed mb-10 whitespace-pre-line">
                  {l.aboutLectureBioLines}
                </p>
              ) : l.bilingualOrder === "en-first" ? (
                <>
                  {l.aboutLectureBioEn && (
                    <p className="leading-relaxed text-justify mb-6 whitespace-pre-line">
                      {l.aboutLectureBioEn}
                    </p>
                  )}
                  {l.aboutLectureBioZh && (
                    <p className="leading-relaxed text-justify mb-14 whitespace-pre-line">
                      {l.aboutLectureBioZh}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {l.aboutLectureBioZh && (
                    <p className="leading-relaxed text-justify mb-6 whitespace-pre-line">
                      {l.aboutLectureBioZh}
                    </p>
                  )}
                  {l.aboutLectureBioEn && (
                    <p className="leading-relaxed text-justify mb-14 whitespace-pre-line">
                      {l.aboutLectureBioEn}
                    </p>
                  )}
                </>
              )}

              {/* Speaker 2 (for lectures with two speakers) */}
              {l.speaker2Photo && (
                <>
                  <div className="flex justify-center mb-4 mt-10">
                    {l.hasSpeaker2Photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.speaker2Photo}
                        alt={l.speaker2CaptionName || "Speaker"}
                        className="w-64 h-auto object-cover"
                      />
                    ) : (
                      <div className="w-64 aspect-[4/5] bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3">
                        Speaker photo not added — /public{l.speaker2Photo}
                      </div>
                    )}
                  </div>
                  {l.speaker2CaptionName && (
                    <div className="text-center mb-6">
                      <p className="font-bold text-gray-900">{l.speaker2CaptionName}</p>
                      {l.speaker2CaptionAffiliation && (
                        <p className="text-gray-700">{l.speaker2CaptionAffiliation}</p>
                      )}
                    </div>
                  )}
                  {l.speaker2BioLines && (
                    <p className="leading-relaxed mb-14 whitespace-pre-line">
                      {l.speaker2BioLines}
                    </p>
                  )}
                </>
              )}

              {/* Overview */}
              {(l.overviewZh || l.overviewEn) && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
                    {l.overviewLabel || "Overview / 讲座预告"}
                  </h3>
                  {l.bilingualOrder === "en-first" ? (
                    <>
                      {l.overviewEn && (
                        <p className="leading-relaxed text-justify mb-6 whitespace-pre-line">
                          {l.overviewEn}
                        </p>
                      )}
                      {l.overviewZh && (
                        <p className="leading-relaxed text-justify mb-14 whitespace-pre-line">
                          {l.overviewZh}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {l.overviewZh && (
                        <p className="leading-relaxed text-justify mb-6 whitespace-pre-line">
                          {l.overviewZh}
                        </p>
                      )}
                      {l.overviewEn && (
                        <p className="leading-relaxed text-justify mb-14 whitespace-pre-line">
                          {l.overviewEn}
                        </p>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Organizer */}
              {l.organizerName && (
                <>
                  <h3 className="text-lg font-bold text-gray-900 text-center mb-6">
                    Organizer / 主办
                  </h3>
                  <div className="flex justify-center mb-4">
                    {l.hasOrganizerPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.organizerPhoto}
                        alt={l.organizerName}
                        className="w-56 h-auto object-cover"
                      />
                    ) : (
                      <div className="w-56 aspect-[4/5] bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3">
                        Organizer photo not added — /public{l.organizerPhoto}
                      </div>
                    )}
                  </div>
                  <div className="text-center mb-8">
                    {l.organizerCaption ? (
                      <p className="whitespace-pre-line">{l.organizerCaption}</p>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900">{l.organizerName}</p>
                        {l.organizerRole && <p>{l.organizerRole}</p>}
                        {l.organizerInstitute && <p>{l.organizerInstitute}</p>}
                        {l.organizerAffiliation && <p>{l.organizerAffiliation}</p>}
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Zoom link button */}
              {l.zoomLink && (
                <div className="flex justify-center mb-8">
                  <a
                    href={l.zoomLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-[#f3ddc4] text-gray-800 px-8 py-3 text-sm font-bold tracking-wide hover:bg-[#ecd0af] transition-colors"
                  >
                    ZOOM LINK
                  </a>
                </div>
              )}

              {/* Attendance heading + date/time lines */}
              {(l.attendanceHeading || l.attendanceLines) && (
                <div className="text-center mb-8">
                  {l.attendanceHeading && (
                    <h3 className="text-lg font-bold text-gray-900 underline mb-4">
                      {l.attendanceHeading}
                    </h3>
                  )}
                  {l.attendanceLines && (
                    <p className="text-gray-700 whitespace-pre-line">{l.attendanceLines}</p>
                  )}
                </div>
              )}

              {/* QR code */}
              {l.qrImage && l.qrPosition !== "at-end" && (
                <div className="flex justify-center mb-4">
                  {l.hasQrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.qrImage} alt="Zoom QR code" className="w-56 h-auto" />
                  ) : (
                    <div className="w-56 aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3">
                      QR image not added — /public{l.qrImage}
                    </div>
                  )}
                </div>
              )}

              {/* Online meeting label + Meeting ID / Passcode */}
              {(l.onlineMeetingLabel || l.bilingualMeetingId || l.bilingualPasscode) && (
                <div className="text-center text-sm text-gray-700 mb-10 space-y-1">
                  {l.onlineMeetingLabel && (
                    <p className="font-semibold text-gray-900">{l.onlineMeetingLabel}</p>
                  )}
                  {l.bilingualMeetingId && <p>{l.bilingualMeetingId}</p>}
                  {l.bilingualPasscode && <p>{l.bilingualPasscode}</p>}
                </div>
              )}

              {/* QR code shown at the end instead, for lectures where qrPosition is "at-end" */}
              {l.qrImage && l.qrPosition === "at-end" && (
                <div className="flex justify-center mb-4">
                  {l.hasQrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.qrImage} alt="Zoom QR code" className="w-56 h-auto" />
                  ) : (
                    <div className="w-56 aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3">
                      QR image not added — /public{l.qrImage}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Simple format */}
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
                {l.title}
              </h2>

              {l.description && (
                <p className="leading-relaxed text-justify mb-14 whitespace-pre-line">
                  {l.description}
                </p>
              )}

              <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
                About the Speaker
              </h3>

              <div className="flex justify-center mb-6">
                {l.hasSpeakerPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.speakerPhoto}
                    alt={l.speakerName}
                    className="w-48 h-56 object-cover"
                  />
                ) : (
                  <div className="w-48 h-56 bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center px-3">
                    Speaker photo not added — /public{l.speakerPhoto}
                  </div>
                )}
              </div>

              {l.speakerBio && (
                <p className="leading-relaxed text-justify mb-14 whitespace-pre-line">
                  {l.speakerBio}
                </p>
              )}

              {(l.zoomMeetingId || l.passcode || l.date) && (
                <>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
                    Attendance Info:
                  </h3>
                  <ul className="list-disc pl-6 space-y-2">
                    {l.zoomMeetingId && (
                      <li>
                        <span className="font-semibold">Zoom Meeting ID:</span> {l.zoomMeetingId}
                      </li>
                    )}
                    {l.passcode && (
                      <li>
                        <span className="font-semibold">Passcode:</span> {l.passcode}
                      </li>
                    )}
                    {l.date && <li>Date: {l.date}</li>}
                  </ul>
                </>
              )}
            </>
          )}
          {l.registrationOpen && (
            <div id="register" className="mt-14 scroll-mt-24">
              <LectureRegistration slug={l.slug} />
            </div>
          )}
        </div>
      </section>

      {/* Prev / Next navigation */}
      <section className="w-full border-t border-gray-200 py-6">
        <div className="mx-auto max-w-3xl px-4 flex justify-between text-sm text-gray-600">
          {prev ? (
            <Link href={`/lectures/${prev.slug}`} className="hover:text-cisma-blue">
              &larr; {prev.cardTitle}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/lectures/${next.slug}`} className="hover:text-cisma-blue">
              {next.cardTitle} &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>
    </>
  );
}