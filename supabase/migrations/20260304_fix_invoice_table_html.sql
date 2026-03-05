-- Migration: Fix malformed invoice table HTML in collection_templates
-- Issue: Tables have 10 cells in {{#each}} rows but only 5 columns
-- Fix: Standardize to 5 columns with proper colspan values

-- Update templates that have the malformed table structure
-- This fixes colspan="0" (invalid) and colspan="1" (redundant) issues
UPDATE collection_templates
SET content_html = REPLACE(
    REPLACE(
        REPLACE(
            content_html,
            -- Fix the {{#each}} row: replace 10 cells with single colspan="5" cell
            '<tr><td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); font-family: monospace; font-size: 10px; color: rgb(107, 114, 128);"><p>{{#each invoices}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr>',
            '<tr><td colspan="5" style="padding: 8px; border: 1px solid rgb(229, 231, 235); font-family: monospace; font-size: 10px; color: rgb(107, 114, 128);"><p>{{#each invoices}}</p></td></tr>'
        ),
        -- Fix the data row: remove extra 5 empty cells at the end
        '<td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); font-size: 14px;"><p>{{invoice_number}}</p></td><td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{amount_due}}</p></td><td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{invoice_date}}</p></td><td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{due_date}}</p></td><td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{days_overdue}}</p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td>',
        '<td style="padding: 8px; border: 1px solid rgb(229, 231, 235); font-size: 14px;"><p>{{invoice_number}}</p></td><td style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{amount_due}}</p></td><td style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{invoice_date}}</p></td><td style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{due_date}}</p></td><td style="padding: 8px; border: 1px solid rgb(229, 231, 235); text-align: left; font-size: 14px;"><p>{{days_overdue}}</p></td>'
    ),
    -- Fix the {{/each}} row: replace 10 cells with single colspan="5" cell
    '<tr><td colspan="0" rowspan="1" style="padding: 8px; border: 1px solid rgb(229, 231, 235); font-family: monospace; font-size: 10px; color: rgb(107, 114, 128);"><p>{{/each}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr>',
    '<tr><td colspan="5" style="padding: 8px; border: 1px solid rgb(229, 231, 235); font-family: monospace; font-size: 10px; color: rgb(107, 114, 128);"><p>{{/each}}</p></td></tr>'
)
WHERE content_html LIKE '%{{#each invoices}}%' 
  AND content_html LIKE '%colspan="0"%'
  AND template_type = 'email';

-- Add comment to document the migration
COMMENT ON TABLE collection_templates IS 'Email templates for collection. Table structure fixed on 2026-03-04 to resolve malformed invoice tables with colspan=0 and extra cells.';
