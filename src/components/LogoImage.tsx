import Image from "next/image";

type LogoImageSize =
  | "card"
  | "detail"
  | "thumb"
  | "variant"
  | "adminList"
  | "adminStage";

interface LogoImageProps {
  src: string;
  alt: string;
  size?: LogoImageSize;
  className?: string;
}

const sizeClasses: Record<LogoImageSize, string> = {
  card: "channel-asset-image--card h-[100px] w-auto max-w-full object-contain md:h-[120px]",
  detail:
    "channel-asset-image--detail h-[220px] w-auto max-w-full object-contain",
  thumb: "pointer-events-none h-8 w-auto max-w-14 object-contain",
  variant: "h-[72px] w-auto max-w-full object-contain",
  // 관리자 목록용 큰 썸네일
  adminList:
    "pointer-events-none h-16 w-auto max-w-[5.5rem] object-contain md:h-20 md:max-w-[7rem]",
  // 관리자 편집 스테이지
  adminStage:
    "h-[min(52vh,520px)] w-auto max-h-[min(52vh,520px)] max-w-full object-contain",
};

export function LogoImage({
  src,
  alt,
  size = "card",
  className = "",
}: LogoImageProps) {
  const large = size === "card" || size === "detail" || size === "adminStage";
  return (
    <Image
      src={src}
      alt={alt}
      width={large ? 1280 : 256}
      height={large ? 960 : 256}
      className={`${sizeClasses[size]} ${className}`.trim()}
      unoptimized
    />
  );
}
