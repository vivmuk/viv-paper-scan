'use client';
import { Masthead } from './almanac';
import { ScanStatus } from './scan-status';
import { useScan } from './scan-provider';
import { PetitionForm } from './petition-form';
import { petitionItems } from '@/lib/petition-client';
export function PetitionView() {
  const { scan } = useScan();
  return <><ScanStatus /><header className="petition-header"><Masthead>THE PETITION</Masthead>
    {scan && <p className="document-intro">{petitionItems(scan).length} particulars wanting. Choose which to petition for.</p>}</header><PetitionForm /></>;
}
