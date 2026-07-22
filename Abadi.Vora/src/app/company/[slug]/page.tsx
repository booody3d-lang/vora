import { redirect } from "next/navigation";



interface CompanyAliasPageProps {

  params: Promise<{ slug: string }>;

}



export default async function CompanyAliasPage({ params }: CompanyAliasPageProps) {

  const { slug } = await params;

  redirect(`/network/company/${slug}`);

}

