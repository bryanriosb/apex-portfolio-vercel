// index.ts - Exportaciones del wizard de campañas

// Main component
export { CreationWizard } from './CreationWizard'

// Step components
export { Step1Content } from './Step1Content'
export { Step2Content } from './Step2Content'
export { Step3Content } from './Step3Content'

// Sidebar component
export { CampaignInfoSidebar } from './CampaignInfoSidebar'

// Email Limit Indicators
export { EmailLimitIndicator } from './EmailLimitIndicator'
export { CompactEmailLimitIndicator } from './CompactEmailLimitIndicator'

// Threshold Preview
export { ThresholdPreview } from './ThresholdPreview'

// Types
export type {
  WizardStep,
  Invoice,
  GroupedClient,
  FileData,
  EmailConfig,
  StrategyType,
  StrategyOption,
} from './types'

export {
  CAMPAIGN_WIZARD_STEPS,
  REQUIRED_COLUMNS,
  COLUMN_MAPPING,
  COLUMN_LABELS,
  TEMPLATE_DATA,
  STRATEGY_OPTIONS,
} from './types'

// Utilities
export { parseInvoiceFile } from './utils'
