import Image from "next/image";

export default function MilanAnnouncement() {
  return (
        <section id="milan" className="w-full scroll-mt-24 bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* Image */}
        <div className="relative w-full md:w-5/7 aspect-[4/3] rounded-md overflow-hidden">
          <Image
            src="/milan-conference.jpg"
            alt="CISMA International Conference 2027, Milan, Italy"
            fill
            className="object-cover"
          />
        </div>

        {/* Text */}
        <div className="w-full md:w-3/6 text-center px-2">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-600 leading-tight mb-4">
            CISMA International Conference 2027, Milan, Italy
          </h2>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Join us for the upcoming CISMA Conference 2027, hosted at Universit&agrave; Cattolica del Sacro Cuore, Milan, Italy, jointly hosted by SISU and Cattolica.
          </p>
        </div>
      </div>
    </section>
  );
}
