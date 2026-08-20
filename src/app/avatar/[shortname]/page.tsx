import { AssetDetailPage } from "@/components/AssetDetailPage";

interface AvatarDetailPageProps {
  params: Promise<{ shortname: string }>;
}

export default async function AvatarDetailPage({ params }: AvatarDetailPageProps) {
  return <AssetDetailPage params={params} channelId="avatars" />;
}
