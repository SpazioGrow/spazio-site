@AGENTS.md

# Spazio Site — Claude Code Context

## What this is
Marketing site for Spazio design studio. Lead capture
form feeds the SpazioOS Airtable base.

## Airtable
- Base: SpazioOS — appv2sIRwDvNPjV7j
- Leads table: tbl5qLZO9mAN9LQ0P
- Form field mapping (use field IDs — some field names
  have trailing spaces):
  - name → fldcNCcvpv3UYK7sR
  - email → fld8bcTQhFU2ZBxKS
  - company → fldK7UmiFjbqxuibh
  - website → fldJeI9yMHWp9CMaI
  - service interest → fld15eMrZbh2n8Kev
  - Source (hardcode "Website Form") → fldD97lODtKXRBp57
- Always send "typecast": true so select fields
  accept values.

## Rules
- AIRTABLE_TOKEN lives in env vars ONLY. Never expose
  it client-side or commit it.
- Form posts go through our own server-side endpoint,
  never directly from the browser to Airtable.
- Asana sync runs from Airtable automations — this
  repo never talks to Asana directly.

## Brand
- Lime green + ink on warm cream. The floating dot
  is the signature mark — don't remove it.
