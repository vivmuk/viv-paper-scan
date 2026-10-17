import type { Polarity } from './engine.ts';

export type { Polarity } from './engine.ts';
export type Domain = 'design' | 'stats' | 'materials' | 'openness' | 'ethics' | 'claims';
export type Module =
  | 'empirical' | 'intervention' | 'antibodies' | 'animals' | 'cells'
  | 'humans' | 'trial' | 'ml' | 'omics';

export interface CatalogueCheck {
  id: string;
  domain: Domain;
  question: string;
  guidelines: string[];
  module?: Module | Module[];
  polarity: Polarity;
  provenance: string;
}

/**
 * Independently composed reporting enquiries, not a measure of scientific truth.
 * ARRIVE references were checked against the published 2020 checklist, Tables 1 and 2:
 * https://pmc.ncbi.nlm.nih.gov/articles/mid/EMS122912/
 * Ethical approval is item 14, not item 13 as the structural source labels it.
 * An ARRIVE reference identifies the origin of a reporting principle; it does not
 * make ARRIVE applicable to non-animal research or constitute a full compliance audit.
 * Study-type gates are carried per check: a gated check is asked only when its study type is
 * detected in the paper at or above the gate confidence, otherwise it is reported as not applying.
 */
export const CATALOGUE: CatalogueCheck[] = [
  {
    id: 'hypothesis', domain: 'design',
    question: 'Can readers identify the prediction or research question that guided the investigation?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'primary_outcome', domain: 'design',
    question: 'Is one measured result identified as the main outcome used to answer the research question?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'control_group', domain: 'design', module: ['empirical', 'humans'],
    question: 'Which reference group provides the comparison, or why was no comparison group needed?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'n_per_group', domain: 'design', module: ['empirical', 'humans'],
    question: 'Can readers find the number of independent samples or participants assigned to every study group?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'sample_size_rationale', domain: 'design', module: ['empirical', 'humans'],
    question: 'What reasoning or calculation led the researchers to choose the amount of material or number of subjects studied?',
    guidelines: ['ARRIVE 2.0 item 2b'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 2b, Sample size (2020)',
  },
  {
    id: 'randomization', domain: 'design', module: ['intervention'],
    question: 'Does the account of group assignment say whether chance determined which group each subject entered?',
    guidelines: ['ARRIVE 2.0 item 4a'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 4a, Randomisation (2020)',
  },
  {
    id: 'randomization_method', domain: 'design', module: ['intervention'],
    question: 'What procedure generated the chance-based assignments of subjects or samples to study groups?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'blinding_allocation', domain: 'design', module: ['intervention'],
    question: 'Can readers tell whether the people assigning subjects to groups knew the identities of those groups?',
    guidelines: ['ARRIVE 2.0 item 5'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 5, Blinding (2020)',
  },
  {
    id: 'blinding_outcome', domain: 'design', module: ['intervention'],
    question: 'Can readers tell whether those measuring or judging the outcomes knew which treatment each subject received?',
    guidelines: ['ARRIVE 2.0 item 5'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 5, Blinding (2020)',
  },
  {
    id: 'inclusion_criteria', domain: 'design', module: ['empirical', 'humans'],
    question: 'What rules decided which subjects or samples could enter the study, and when were those rules set?',
    guidelines: ['ARRIVE 2.0 item 3a'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 3a, Inclusion and exclusion criteria (2020)',
  },
  {
    id: 'exclusions_reported', domain: 'design', module: ['empirical', 'humans'],
    question: 'Does the paper account for every removed subject or measurement with a reason, or explicitly state that none were removed?',
    guidelines: ['ARRIVE 2.0 item 3b'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 3b, Inclusion and exclusion criteria (2020)',
  },
  {
    id: 'replication', domain: 'design', module: ['empirical'],
    question: 'How many separate repeats were performed for each experiment, according to the paper?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'replicate_type', domain: 'design', module: ['cells', 'animals'],
    question: 'Can readers distinguish new biological samples from repeated measurements of the same sample?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'tests_named', domain: 'stats',
    question: 'Which statistical test or model was used for each comparison or analysis in the paper?',
    guidelines: ['ARRIVE 2.0 item 7a'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 7a, Statistical methods (2020)',
  },
  {
    id: 'unit_of_analysis', domain: 'stats', module: ['empirical'],
    question: 'What counted as one independent observation in the analysis: a subject, a sample, a group, or something else?',
    guidelines: ['ARRIVE 2.0 item 1b'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 1b, Study design (2020)',
  },
  {
    id: 'assumptions', domain: 'stats',
    question: 'How did the researchers check that their data were suitable for the statistical methods they chose?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'multiple_comparisons', domain: 'stats',
    question: 'How did the analysis limit chance findings when many comparisons were made, or explain why no adjustment was used?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'uncertainty', domain: 'stats',
    question: 'Can readers find a range or other numerical measure showing how uncertain the main estimates are?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'effect_size', domain: 'stats',
    question: 'How large was the observed difference or relationship, in numbers rather than just a significance label?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'error_bars', domain: 'stats',
    question: 'Do figure legends explain what each error bar represents and how many independent observations underlie it?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'stats_software', domain: 'stats',
    question: 'Which software packages and versions carried out the statistical analyses?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'significance_only', domain: 'stats',
    question: 'Does the paper judge its main findings solely by statistical significance, without reporting their size or uncertainty?',
    guidelines: [], polarity: 'flag', provenance: 'standard reporting practice',
  },
  {
    id: 'species_strain', domain: 'materials', module: ['animals'],
    question: 'Can readers identify the animal species and the strain or genetic line used in each experiment?',
    guidelines: ['ARRIVE 2.0 item 8a'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 8a, Experimental animals (2020)',
  },
  {
    id: 'animal_sex', domain: 'materials', module: ['animals'],
    question: 'What sex were the animals used in each group, as documented in the methods or results?',
    guidelines: ['ARRIVE 2.0 item 8a'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 8a, Experimental animals (2020)',
  },
  {
    id: 'animal_age', domain: 'materials', module: ['animals'],
    question: 'What ages or developmental stages had the animals reached when they entered the experiments?',
    guidelines: ['ARRIVE 2.0 item 8a'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 8a, Experimental animals (2020)',
  },
  {
    id: 'animal_source', domain: 'materials', module: ['animals'],
    question: 'Where were the research animals obtained or bred, according to the paper?',
    guidelines: ['ARRIVE 2.0 item 8b'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 8b, Experimental animals (2020)',
  },
  {
    id: 'housing', domain: 'materials', module: ['animals'],
    question: 'What living conditions, routine care, and environmental enrichment did the animals receive?',
    guidelines: ['ARRIVE 2.0 item 15'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 15, Housing and husbandry (2020)',
  },
  {
    id: 'cell_source', domain: 'materials', module: ['cells'],
    question: 'Can readers trace each cell line or primary cell preparation to its supplier or original source?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'cell_authentication', domain: 'materials', module: ['cells'],
    question: 'What identity checks confirmed that the cultured cells were the cell lines the researchers intended to study?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'mycoplasma', domain: 'materials', module: ['cells'],
    question: 'What screening evidence establishes whether mycoplasma was present in the cultures used for the experiments?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'antibody_ids', domain: 'materials', module: ['antibodies'],
    question: 'Can each antibody be traced using its supplier and catalogue number or another stable identifier?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'reagent_sources', domain: 'materials', module: ['cells', 'animals'],
    question: 'Where can readers find the suppliers and identifying details for the key chemicals and other reagents?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'doses', domain: 'materials', module: ['intervention'],
    question: 'What amount or concentration of each treatment was used, by which route, and on what schedule?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'instruments', domain: 'materials', module: ['empirical'],
    question: 'Which instrument models and operating settings were used to produce the reported measurements?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'data_statement', domain: 'openness',
    question: 'What instructions tell prospective users whether the dataset is accessible and what conditions govern access?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'data_repository', domain: 'openness',
    question: 'Which archive holds the study dataset, and what persistent identifier or working link locates the deposit?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'data_on_request', domain: 'openness',
    question: 'Is asking the authors directly the only stated route to the data, with no deposited dataset offered?',
    guidelines: [], polarity: 'flag', provenance: 'standard reporting practice',
  },
  {
    id: 'code_available', domain: 'openness',
    question: 'What arrangements let another researcher acquire the computational scripts behind the published analyses?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'code_link', domain: 'openness',
    question: 'What repository address or permanent identifier directs readers to the analysis code for this study?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'protocol_shared', domain: 'openness', module: ['empirical'],
    question: 'Where can readers obtain the detailed study protocol rather than relying only on the methods summary?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'preregistration', domain: 'openness',
    question: 'Can readers locate a dated record of the study questions and analysis plan made before the work began?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'supplement', domain: 'openness',
    question: 'Does the article point readers to supporting files containing additional methods, figures, or results?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'raw_data', domain: 'openness',
    question: 'Can readers obtain the underlying measurements before they were combined into summaries or figures?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'ethics_approval', domain: 'ethics', module: ['humans', 'animals'],
    question: 'Which review body authorised the animal work, or what reason is given for proceeding without that approval?',
    guidelines: ['ARRIVE 2.0 item 14'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 14, Ethical statement (2020)',
  },
  {
    id: 'approval_number', domain: 'ethics', module: ['humans', 'animals'],
    question: 'What approval, licence, or protocol identifier lets readers trace the ethical authorisation for the study?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'consent', domain: 'ethics', module: ['humans'],
    question: 'How was informed agreement obtained from human participants, or why was a consent waiver granted?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'humane_endpoints', domain: 'ethics', module: ['animals'],
    question: 'What signs triggered an early end to an animal experiment, how often were they checked, or why were no stop rules set?',
    guidelines: ['ARRIVE 2.0 item 16c'], polarity: 'good',
    provenance: 'ARRIVE 2.0 item 16c, Animal care and monitoring (2020)',
  },
  {
    id: 'analgesia', domain: 'ethics', module: ['animals'],
    question: 'What pain relief did the animals receive, including the drug, dose, and timing, or why was none given?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'euthanasia', domain: 'ethics', module: ['animals'],
    question: 'How were animals killed at the end of the study, including the procedure used to confirm death?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'funding', domain: 'ethics',
    question: 'Which organisations paid for the work, and what grant identifiers accompany that support?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'funder_role', domain: 'ethics',
    question: 'What involvement did the sponsors have in planning, analysing, writing, or deciding to publish the study?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'competing_interests', domain: 'ethics',
    question: 'Does the paper disclose relationships that could influence the work, or explicitly declare that there are none?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'contributions', domain: 'ethics',
    question: 'Who performed each major part of the research and preparation of the manuscript?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'guideline_named', domain: 'ethics', module: ['empirical', 'humans'],
    question: 'Which recognised reporting checklist does the paper explicitly identify as guiding its preparation?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'limitations', domain: 'claims',
    question: 'What weaknesses or sources of bias does the discussion identify that could change the interpretation of the findings?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'prior_work', domain: 'claims',
    question: 'How does the discussion relate the new findings to earlier research, including agreement or disagreement?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'alternatives', domain: 'claims',
    question: 'What other plausible explanations for the observations are considered alongside the preferred interpretation?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'null_results', domain: 'claims',
    question: 'Where does the paper report tested outcomes that showed no clear difference or relationship?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'translation_caveat', domain: 'claims', module: ['animals'],
    question: 'What cautions are given about applying the findings to people, other organisms, or settings beyond those studied?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'causal_overreach', domain: 'claims',
    question: 'Does the interpretation assert that one factor causes another when the study design can establish only an association?',
    guidelines: [], polarity: 'flag', provenance: 'standard reporting practice',
  },
  {
    id: 'overgeneralization', domain: 'claims',
    question: 'Do the conclusions make broad claims about populations or conditions that the study did not examine or justify?',
    guidelines: [], polarity: 'flag', provenance: 'standard reporting practice',
  },
  {
    id: 'future_work', domain: 'claims',
    question: 'What specific follow-up studies does the discussion propose to address the questions left open?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'trial_registration', domain: 'design', module: ['trial'],
    question: 'Which public trial registry entry identifies the study, and is its registration number supplied?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'allocation_concealment', domain: 'design', module: ['trial'],
    question: 'How were upcoming treatment assignments kept hidden from the people deciding who entered the study?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'adverse_events', domain: 'claims', module: ['trial'],
    question: 'What harms or unintended effects occurred during the study, or does the paper explicitly say that none occurred?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'confounders', domain: 'stats', module: ['humans'],
    question: 'Which other factors could explain the observed relationship, and how were they handled in the analysis?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'missing_data', domain: 'stats', module: ['humans'],
    question: 'How much information was missing, why was it absent, and how did the analysis handle the gaps?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'holdout', domain: 'stats', module: ['ml'],
    question: 'Which observations were reserved for testing the model rather than being used to fit or tune it?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'leakage', domain: 'stats', module: ['ml'],
    question: 'What safeguards kept information from the test data out of model training, tuning, and data preparation?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'baseline', domain: 'stats', module: ['ml'],
    question: 'Which simple prediction rule or established method was used as a reference for judging model performance?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'external_validation', domain: 'stats', module: ['ml'],
    question: 'How did the model perform on data collected independently of the data used to develop it?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'omics_accession', domain: 'openness', module: ['omics'],
    question: 'What archive accession numbers identify the deposited sequencing or other large-scale molecular datasets?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'fdr', domain: 'stats', module: ['omics'],
    question: 'How did the analysis estimate or limit the share of reported molecular findings that could be false discoveries?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
  {
    id: 'batch_effects', domain: 'stats', module: ['omics'],
    question: 'How were differences caused by processing samples in separate batches checked and handled?',
    guidelines: [], polarity: 'good', provenance: 'standard reporting practice',
  },
];
