import { AssetDetailPage } from "@/components/AssetDetailPage";

interface IconDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function IconDetailPage({ params }: IconDetailPageProps) {
  return <AssetDetailPage params={params} channelId="icons" />;
}
