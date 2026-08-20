import { AssetDetailPage } from "@/components/AssetDetailPage";

interface IllustDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function IllustDetailPage({ params }: IllustDetailPageProps) {
  return <AssetDetailPage params={params} channelId="illust" />;
}
