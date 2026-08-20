import { AssetDetailPage } from "@/components/AssetDetailPage";

interface ImageDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function ImageDetailPage({ params }: ImageDetailPageProps) {
  return <AssetDetailPage params={params} channelId="images" />;
}
