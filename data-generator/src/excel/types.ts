export interface ExcelGenerationRequest {
  scenario: string;
  industry: string;
  notes: string;
  dau?: number;
  dateStart?: string;
  dateEnd?: string;
  eventCount?: number;
}

export interface TaxonomyEvent {
  event_name: string;
  event_name_kr: string;
  description?: string;
  category?: string;
  stage?: string;
  tags?: string[];
}

export interface TaxonomyProperty {
  event_name?: string;
  property_name: string;
  property_name_kr: string;
  data_type: string;
  description?: string;
  required?: boolean;
  example?: string;
  allowed_values?: string[];
}

export interface TaxonomyFunnel {
  name: string;
  description?: string;
  steps: string[];
  conversion_rate?: number;
}

export interface TaxonomySegment {
  name: string;
  ratio?: number;
  notes?: string;
}

export interface TaxonomyPlan {
  events: TaxonomyEvent[];
  properties: TaxonomyProperty[];
  funnels: TaxonomyFunnel[];
  segments: TaxonomySegment[];
  insights?: string[];
}
