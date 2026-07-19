import { redirect } from "next/navigation";



interface ProfileAliasPageProps {

  params: Promise<{ slug: string }>;

}



export default async function ProfileAliasPage({ params }: ProfileAliasPageProps) {

  const { slug } = await params;

  redirect(`/network/profile/${slug}`);

}

