import { AssetDetailPage } from "@/components/AssetDetailPage";

interface PictogramDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function PictogramDetailPage({
  params,
}: PictogramDetailPageProps) {
  return <AssetDetailPage params={params} channelId="pictograms" />;
}
