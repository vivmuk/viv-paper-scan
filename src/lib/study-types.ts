/**
 * The nine study types a manuscript can be, and the test for each.
 *
 * This lives apart from the scan orchestration on purpose: the server uses these tests to gate
 * enquiries, and the reading display names the types it recognises as the scan proceeds. If it
 * lived in the server module, importing one label would drag the Venice client into the browser
 * bundle. Only a paper's own content may open a gate.
 */
export const STUDY_TYPES: Array<{ type: string; label: string; test: string }> = [
  { type: 'empirical', label: 'new experimental data', test: 'the paper generates new measurements or observations of its own' },
  { type: 'intervention', label: 'assigned treatments', test: 'the paper decides which subjects receive which condition' },
  { type: 'animals', label: 'animal work', test: 'living non-human animals are studied' },
  { type: 'humans', label: 'human participants', test: 'human participants or their specimens are studied' },
  { type: 'trial', label: 'a clinical trial', test: 'a prospectively registered trial of an intervention in humans is reported' },
  { type: 'cells', label: 'cell lines', test: 'cultured cell lines are used' },
  { type: 'antibodies', label: 'antibody reagents', test: 'antibodies are used as reagents' },
  { type: 'ml', label: 'a prediction model', test: 'a model is trained or evaluated to predict an outcome' },
  { type: 'omics', label: 'large-scale molecular data', test: 'sequencing, proteomics or similar high-throughput data are produced' },
];
