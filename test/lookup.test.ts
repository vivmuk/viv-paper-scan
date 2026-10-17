import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDoi, looksLikeDoi } from '../src/lib/crossref.ts';

function reply(payload, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

const RETRACTED = {
  message: {
    title: ['A study that was later withdrawn'],
    issued: { 'date-parts': [[2019, 4, 2]] },
    'update-to': [
      { type: 'retraction', DOI: '10.1234/retraction.notice', updated: { 'date-parts': [[2021, 6, 1]] } },
    ],
  },
};

test('a DOI is recognised by its shape, not by its resolvability', () => {
  assert.equal(looksLikeDoi('10.1371/journal.pone.0293905'), true);
  assert.equal(looksLikeDoi('  10.1234/abc.def  '), true);
  assert.equal(looksLikeDoi('not a doi'), false);
  assert.equal(looksLikeDoi('https://doi.org/10.1234/abc'), false, 'the URL form is stripped before this check');
  assert.equal(looksLikeDoi('10.1/x'), false, 'the registrant prefix must be at least four digits');
});

test('a retraction is reported as the register states it, with its date', async () => {
  let asked = '';
  const fakeFetch = async (url) => {
    asked = String(url);
    return reply(RETRACTED);
  };
  const record = await fetchDoi('10.1234/withdrawn', fakeFetch);
  assert.equal(record.found, true);
  assert.equal(record.title, 'A study that was later withdrawn');
  assert.equal(record.year, 2019);
  assert.equal(record.updates.length, 1);
  assert.equal(record.updates[0].type, 'retraction');
  assert.equal(record.updates[0].doi, '10.1234/retraction.notice');
  assert.equal(record.updates[0].date, '2021-6-1');
  assert.match(asked, /api\.crossref\.org\/works\/10\.1234%2Fwithdrawn/);
});

test('a resolvable DOI with no notices carries an empty update list, not a missing field', async () => {
  const record = await fetchDoi('10.1234/clean', async () => reply({ message: { title: ['Fine'], issued: { 'date-parts': [[2020]] } } }));
  assert.equal(record.found, true);
  assert.deepEqual(record.updates, []);
});

test('a DOI the register does not know is reported as not found, without an error', async () => {
  const record = await fetchDoi('10.1234/missing', async () => reply({}, 404));
  assert.deepEqual(record, { found: false });
});

test('a register failure is surfaced as an error rather than read as absence', async () => {
  const record = await fetchDoi('10.1234/boom', async () => reply({}, 503));
  assert.equal(record.found, false);
  assert.match(record.error, /crossref returned 503/);
});

test('an unreachable register is distinguished from a missing DOI', async () => {
  const record = await fetchDoi('10.1234/offline', async () => {
    throw new Error('getaddrinfo ENOTFOUND');
  });
  assert.equal(record.found, false);
  assert.match(record.error, /could not reach crossref/);
});

test('a value that is not a DOI never reaches the network', async () => {
  let called = false;
  const record = await fetchDoi('banana', async () => {
    called = true;
    return reply({});
  });
  assert.equal(called, false, 'no request should be made for something that cannot be a DOI');
  assert.deepEqual(record, { found: false, error: 'not a DOI' });
});

test('the full DOI URL form is accepted and sent as a bare DOI', async () => {
  let asked = '';
  await fetchDoi('https://doi.org/10.1234/abc.def', async (url) => {
    asked = String(url);
    return reply({ message: {} });
  });
  assert.match(asked, /works\/10\.1234%2Fabc\.def/);
  assert.equal(asked.includes('doi.org'), false);
});
