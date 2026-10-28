export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Background image: always the full picture, scales with the screen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero.jpg"
        alt="CISMA conference group photo"
        className="block h-auto min-h-[380px] w-full object-cover object-top"
      />

      {/* Dark overlay so text is readable */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Text content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end px-4 pb-10 text-center font-sans-ui md:pb-16">
        <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl md:text-6xl">
          Welcome to CISMA !
        </h1>
        <p className="text-base text-white/90 sm:text-lg md:text-xl">
          Join CISMA Community for Regular Events !
        </p>
      </div>

      {/* Scroll-down arrow */}
      <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-cisma-navy shadow-md">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
            <path d="M5 7l5 6 5-6z" />
          </svg>
        </div>
      </div>
    </section>
  );
}