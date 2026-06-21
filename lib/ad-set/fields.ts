// lib/ad-set/fields.ts
// Field + table IDs for the Positioned Ad Set pipeline.
// Writes use field IDs (hard convention). Values below are the REAL IDs from the
// Ad Sets / Ad Concepts tables created in base appv2sIRwDvNPjV7j.

export const BASE_ID = 'appv2sIRwDvNPjV7j';

export const AD_SETS_TABLE_ID     = 'tblbrSDBYUDxZfcad';
export const AD_CONCEPTS_TABLE_ID = 'tblhc6hL7SlQD53bx';

// Leads — already created by the foundation flow.
// NOTE: the Leads table has no dedicated "First name" field; FIRST_NAME maps to
// the primary "Name" field (where a lead's name is stored).
export const LEADS_TABLE_ID = 'tbl5qLZO9mAN9LQ0P';
export const LEADS = {
  EMAIL:      'fld8bcTQhFU2ZBxKS', // "Email " (trailing space in name; ID used for writes)
  FIRST_NAME: 'fldcNCcvpv3UYK7sR', // "Name" (primary; no separate First name field)
  SOURCE:     'fldD97lODtKXRBp57',
};

export const ADSET = {
  BRAND_NAME:   'fld2OaQ2e25LkWHPu',
  LEAD:         'fldZwRhyEcVpXccNC',
  OFFER:        'fldO5twEjjVXjOUl1',
  DESTINATION:  'flddmaO99XuclmCPl',
  GUARDRAILS:   'fld0rX3rkSfpdMgUx',
  BRAND_CONFIG: 'fldE1BCXajsIMQWf2',
  MARKET_BRIEF: 'fldthfQw0m9O6CzCV',
  POSITION:     'fldyBQPkaHIAbClfC',
  INEVITABLE:   'fldI8BEfXiqTXeLha',
  INSIDER:      'fld5OdMtpFOSny5KS',
  EFFORTLESS:   'fldcg65oJQSKleVAf',
  STATUS:       'fldKXl9dEvmef1d6c',
};

export const CONCEPT = {
  CONCEPT:  'fld611XBQMf7W3OIv',
  AD_SET:   'fldYeIhmR6MzkBCGc',
  ANGLE:    'fldo5rEVVKDoeQe1z',
  PRIMARY:  'fldTG8RU9OKJynNPO',
  HEADLINE: 'fldeN2XYMiWEBao12',
  VISUAL:   'fldbEKFC4N11D9vAI',
  PROOF:    'fldbmjrDhNWRyCX2h',
  CLAIM:    'fldAuS2LrmaSyx2cS',
  CREATIVE: 'fldG7bn3krFcTE5RV',
  STATUS:   'fld27bvseny4BB1Dt',
  RENDER:   'fldIGBThjaVQPPOMn',
};
