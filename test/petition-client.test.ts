import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, applyScanEvent, presentScan } from '../src/lib/scan-client.ts';

test('petition includes actual gaps and excludes pending, unanswered, and positive enquiries', async () => {
  const { petitionItems, petitionBrief } = await import('../src/lib/petition-client.ts');
  let session = createSession({ title: 'Private title', doi: '10.1000/private' }, [{ id: 'P1', page: 1, section: 'Methods', text: 'Private paper text.' }]);
  session = applyScanEvent(session, { type: 'detections', detections: [{ type: 'empirical', confidence: 1 }] });
  session = applyScanEvent(session, { type: 'domain', domain: 'design', checks: [{ id: 'hypothesis', p: 5, where: [] }, { id: 'primary_outcome', p: 90, where: [] }] });
  const scan = presentScan(session);
  const items = petitionItems(scan);
  assert.deepEqual(items.map(i => i.id), ['hypothesis']);
  const brief = petitionBrief(scan, ['hypothesis'], false);
  assert.ok(brief.includes('HYPOTHESIS STATED'));
  assert.ok(brief.includes('Not affiliated'));
  assert.ok(!brief.includes('Private'));
  assert.ok(!brief.includes('10.1000/private'));
});
