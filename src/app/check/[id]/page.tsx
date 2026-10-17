import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemoNotice, MarginalNote, Masthead } from '@/components/almanac';
import { RadialPlate } from '@/components/radial-plate';
import { CATALOGUE } from '@/lib/catalogue';
import { DEMO_SCAN } from '@/lib/fixtures';
// TODO: POST /api/scan; resolve a check's sentences event to its original paragraph offsets.
export function generateStaticParams() { return CATALOGUE.map((check) => ({ id: check.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = DEMO_SCAN.checks.find((check) => check.id === id);
  return { title: result ? `${result.label} | The Marginal Note` : 'Enquiry not found' };
}
export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = DEMO_SCAN.checks.find((check) => check.id === id);
  if (!result) notFound();
  const passage = result.passage;
  const paragraph = passage && DEMO_SCAN.paragraphs.find((p) => p.id === passage.para);
  return <><DemoNotice /><div className="spread detail-spread">
    <section><Masthead>THE MARGINAL NOTE</Masthead><MarginalNote result={result} detail />
      {paragraph && passage && <section className="folio-excerpt" id={`folio-${passage.page}`} aria-labelledby="folio-heading">
        <h2 className="section-title" id="folio-heading">{passage.section} - Folio {passage.page}</h2>
        <p><span>{paragraph.text.slice(0, passage.start)}</span><mark>{paragraph.text.slice(passage.start, passage.end)}</mark><span>{paragraph.text.slice(passage.end)}</span></p>
      </section>}
    </section>
    <aside className="margin-column detail-margin"><RadialPlate compact /></aside>
  </div></>;
}
