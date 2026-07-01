import Image from "next/image";

type LogoImageSize = "card" | "detail" | "thumb";

interface LogoImageProps {
  src: string;
  alt: string;
  size?: LogoImageSize;
}

const sizeClasses: Record<LogoImageSize, string> = {
  // max-h는 작은 SVG를 키우지 않으므로 높이를 고정
  card: "h-[100px] w-auto max-w-full object-contain md:h-[120px]",
  detail: "h-[220px] w-auto max-w-full object-contain",
  thumb: "pointer-events-none h-8 w-auto max-w-14 object-contain",
};

export function LogoImage({ src, alt, size = "card" }: LogoImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={256}
      height={256}
      className={sizeClasses[size]}
      unoptimized
    />
  );
}
