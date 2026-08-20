import { AssetDetailPage } from "@/components/AssetDetailPage";

interface LogoDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function LogoDetailPage({ params }: LogoDetailPageProps) {
  return <AssetDetailPage params={params} channelId="logos" />;
}
