import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckView } from '@/components/scan-views';
import { CATALOGUE } from '@/lib/catalogue';
export function generateStaticParams() { return CATALOGUE.map(check => ({ id: check.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: CATALOGUE.some(check => check.id === id) ? `${id.replaceAll('_', ' ')} | The Marginal Note` : 'Enquiry not found' };
}
export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!CATALOGUE.some(check => check.id === id)) notFound();
  return <CheckView id={id} />;
}
