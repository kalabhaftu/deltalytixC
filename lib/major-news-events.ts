/**
 * Major Economic News Events and Bank Holidays
 * Based on ForexFactory high-impact (red folder) news events
 * These are recurring events that significantly impact forex markets
 */

export interface NewsEvent {
  id: string
  name: string
  category: 'employment' | 'inflation' | 'gdp' | 'interest-rate' | 'pmi' | 'retail' | 'housing' | 'bank-holiday' | 'other'
  country: 'US' | 'EUR' | 'UK' | 'JP' | 'AU' | 'CA' | 'NZ' | 'CH' | 'GLOBAL'
  description: string
}

export const MAJOR_NEWS_EVENTS: NewsEvent[] = [
  // ========== US EVENTS ==========
  // Employment
  {
    id: 'us-nfp',
    name: 'Non-Farm Payrolls (NFP)',
    category: 'employment',
    country: 'US',
    description: 'Monthly employment report - highest impact'
  },
  {
    id: 'us-unemployment',
    name: 'Unemployment Rate',
    category: 'employment',
    country: 'US',
    description: 'Percentage of unemployed workers'
  },
  {
    id: 'us-adp',
    name: 'ADP Non-Farm Employment',
    category: 'employment',
    country: 'US',
    description: 'Private sector employment report'
  },
  {
    id: 'us-jobless-claims',
    name: 'Unemployment Claims',
    category: 'employment',
    country: 'US',
    description: 'Weekly initial jobless claims'
  },
  
  // Inflation
  {
    id: 'us-cpi',
    name: 'Consumer Price Index (CPI)',
    category: 'inflation',
    country: 'US',
    description: 'Monthly inflation measure'
  },
  {
    id: 'us-core-cpi',
    name: 'Core CPI',
    category: 'inflation',
    country: 'US',
    description: 'CPI excluding food and energy'
  },
  {
    id: 'us-ppi',
    name: 'Producer Price Index (PPI)',
    category: 'inflation',
    country: 'US',
    description: 'Wholesale inflation measure'
  },
  {
    id: 'us-pce',
    name: 'PCE Price Index',
    category: 'inflation',
    country: 'US',
    description: 'Fed\'s preferred inflation gauge'
  },
  
  // Interest Rates & Central Bank
  {
    id: 'us-fomc-rate',
    name: 'FOMC Interest Rate Decision',
    category: 'interest-rate',
    country: 'US',
    description: 'Federal Reserve interest rate decision'
  },
  {
    id: 'us-fomc-statement',
    name: 'FOMC Statement',
    category: 'interest-rate',
    country: 'US',
    description: 'Fed monetary policy statement'
  },
  {
    id: 'us-fomc-minutes',
    name: 'FOMC Meeting Minutes',
    category: 'interest-rate',
    country: 'US',
    description: 'Detailed meeting notes'
  },
  {
    id: 'us-fed-chair',
    name: 'Fed Chair Speech/Press Conference',
    category: 'interest-rate',
    country: 'US',
    description: 'Federal Reserve Chair public appearance'
  },
  
  // GDP
  {
    id: 'us-gdp',
    name: 'GDP (Gross Domestic Product)',
    category: 'gdp',
    country: 'US',
    description: 'Quarterly economic growth'
  },
  {
    id: 'us-gdp-advance',
    name: 'GDP Advance Estimate',
    category: 'gdp',
    country: 'US',
    description: 'First GDP estimate'
  },
  
  // PMI & Manufacturing
  {
    id: 'us-ism-manufacturing',
    name: 'ISM Manufacturing PMI',
    category: 'pmi',
    country: 'US',
    description: 'Manufacturing sector activity'
  },
  {
    id: 'us-ism-services',
    name: 'ISM Services PMI',
    category: 'pmi',
    country: 'US',
    description: 'Services sector activity'
  },
  
  // Retail & Consumer
  {
    id: 'us-retail-sales',
    name: 'Retail Sales',
    category: 'retail',
    country: 'US',
    description: 'Monthly consumer spending'
  },
  {
    id: 'us-consumer-confidence',
    name: 'Consumer Confidence',
    category: 'retail',
    country: 'US',
    description: 'Consumer sentiment index'
  },
  
  // ========== EUROZONE EVENTS ==========
  {
    id: 'ecb-rate',
    name: 'ECB Interest Rate Decision',
    category: 'interest-rate',
    country: 'EUR',
    description: 'European Central Bank rate decision'
  },
  {
    id: 'ecb-press',
    name: 'ECB Press Conference',
    category: 'interest-rate',
    country: 'EUR',
    description: 'ECB President press conference'
  },
  {
    id: 'eur-cpi',
    name: 'Eurozone CPI',
    category: 'inflation',
    country: 'EUR',
    description: 'Eurozone inflation rate'
  },
  {
    id: 'eur-gdp',
    name: 'Eurozone GDP',
    category: 'gdp',
    country: 'EUR',
    description: 'Eurozone economic growth'
  },
  {
    id: 'eur-pmi-manufacturing',
    name: 'Eurozone Manufacturing PMI',
    category: 'pmi',
    country: 'EUR',
    description: 'Manufacturing activity'
  },
  {
    id: 'eur-pmi-services',
    name: 'Eurozone Services PMI',
    category: 'pmi',
    country: 'EUR',
    description: 'Services sector activity'
  },
  
  // ========== UK EVENTS ==========
  {
    id: 'boe-rate',
    name: 'BOE Interest Rate Decision',
    category: 'interest-rate',
    country: 'UK',
    description: 'Bank of England rate decision'
  },
  {
    id: 'uk-cpi',
    name: 'UK CPI',
    category: 'inflation',
    country: 'UK',
    description: 'UK inflation rate'
  },
  {
    id: 'uk-gdp',
    name: 'UK GDP',
    category: 'gdp',
    country: 'UK',
    description: 'UK economic growth'
  },
  {
    id: 'uk-employment',
    name: 'UK Employment Change',
    category: 'employment',
    country: 'UK',
    description: 'UK jobs data'
  },
  
  // ========== JAPAN EVENTS ==========
  {
    id: 'boj-rate',
    name: 'BOJ Interest Rate Decision',
    category: 'interest-rate',
    country: 'JP',
    description: 'Bank of Japan rate decision'
  },
  {
    id: 'jp-cpi',
    name: 'Japan CPI',
    category: 'inflation',
    country: 'JP',
    description: 'Japan inflation rate'
  },
  {
    id: 'jp-gdp',
    name: 'Japan GDP',
    category: 'gdp',
    country: 'JP',
    description: 'Japan economic growth'
  },
  
  // ========== AUSTRALIA EVENTS ==========
  {
    id: 'rba-rate',
    name: 'RBA Interest Rate Decision',
    category: 'interest-rate',
    country: 'AU',
    description: 'Reserve Bank of Australia rate decision'
  },
  {
    id: 'au-employment',
    name: 'Australia Employment Change',
    category: 'employment',
    country: 'AU',
    description: 'Australian jobs report'
  },
  {
    id: 'au-cpi',
    name: 'Australia CPI',
    category: 'inflation',
    country: 'AU',
    description: 'Australia inflation rate'
  },
  
  // ========== CANADA EVENTS ==========
  {
    id: 'boc-rate',
    name: 'BOC Interest Rate Decision',
    category: 'interest-rate',
    country: 'CA',
    description: 'Bank of Canada rate decision'
  },
  {
    id: 'ca-employment',
    name: 'Canada Employment Change',
    category: 'employment',
    country: 'CA',
    description: 'Canadian jobs report'
  },
  {
    id: 'ca-cpi',
    name: 'Canada CPI',
    category: 'inflation',
    country: 'CA',
    description: 'Canada inflation rate'
  },
  
  // ========== NEW ZEALAND EVENTS ==========
  {
    id: 'rbnz-rate',
    name: 'RBNZ Interest Rate Decision',
    category: 'interest-rate',
    country: 'NZ',
    description: 'Reserve Bank of New Zealand rate decision'
  },
  
  // ========== SWITZERLAND EVENTS ==========
  {
    id: 'snb-rate',
    name: 'SNB Interest Rate Decision',
    category: 'interest-rate',
    country: 'CH',
    description: 'Swiss National Bank rate decision'
  },
  
  // ========== BANK HOLIDAYS ==========
  {
    id: 'holiday-us-new-year',
    name: 'US New Year\'s Day',
    category: 'bank-holiday',
    country: 'US',
    description: 'January 1 - US markets closed'
  },
  {
    id: 'holiday-us-mlk',
    name: 'US Martin Luther King Jr. Day',
    category: 'bank-holiday',
    country: 'US',
    description: 'Third Monday in January'
  },
  {
    id: 'holiday-us-presidents',
    name: 'US Presidents\' Day',
    category: 'bank-holiday',
    country: 'US',
    description: 'Third Monday in February'
  },
  {
    id: 'holiday-us-good-friday',
    name: 'US Good Friday',
    category: 'bank-holiday',
    country: 'US',
    description: 'Friday before Easter - Markets closed'
  },
  {
    id: 'holiday-us-memorial',
    name: 'US Memorial Day',
    category: 'bank-holiday',
    country: 'US',
    description: 'Last Monday in May'
  },
  {
    id: 'holiday-us-independence',
    name: 'US Independence Day',
    category: 'bank-holiday',
    country: 'US',
    description: 'July 4 - US markets closed'
  },
  {
    id: 'holiday-us-labor',
    name: 'US Labor Day',
    category: 'bank-holiday',
    country: 'US',
    description: 'First Monday in September'
  },
  {
    id: 'holiday-us-thanksgiving',
    name: 'US Thanksgiving',
    category: 'bank-holiday',
    country: 'US',
    description: 'Fourth Thursday in November'
  },
  {
    id: 'holiday-us-christmas',
    name: 'US Christmas',
    category: 'bank-holiday',
    country: 'US',
    description: 'December 25 - US markets closed'
  },
  {
    id: 'holiday-uk-new-year',
    name: 'UK New Year\'s Day',
    category: 'bank-holiday',
    country: 'UK',
    description: 'January 1 - UK markets closed'
  },
  {
    id: 'holiday-uk-easter',
    name: 'UK Easter Monday',
    category: 'bank-holiday',
    country: 'UK',
    description: 'Monday after Easter'
  },
  {
    id: 'holiday-uk-spring',
    name: 'UK Spring Bank Holiday',
    category: 'bank-holiday',
    country: 'UK',
    description: 'Last Monday in May'
  },
  {
    id: 'holiday-uk-summer',
    name: 'UK Summer Bank Holiday',
    category: 'bank-holiday',
    country: 'UK',
    description: 'Last Monday in August'
  },
  {
    id: 'holiday-uk-christmas',
    name: 'UK Christmas',
    category: 'bank-holiday',
    country: 'UK',
    description: 'December 25-26 - UK markets closed'
  },
  {
    id: 'holiday-eur-new-year',
    name: 'Eurozone New Year\'s Day',
    category: 'bank-holiday',
    country: 'EUR',
    description: 'January 1 - European markets closed'
  },
  {
    id: 'holiday-eur-good-friday',
    name: 'Eurozone Good Friday',
    category: 'bank-holiday',
    country: 'EUR',
    description: 'Friday before Easter'
  },
  {
    id: 'holiday-eur-easter',
    name: 'Eurozone Easter Monday',
    category: 'bank-holiday',
    country: 'EUR',
    description: 'Monday after Easter'
  },
  {
    id: 'holiday-eur-christmas',
    name: 'Eurozone Christmas',
    category: 'bank-holiday',
    country: 'EUR',
    description: 'December 25-26 - European markets closed'
  },
  
  // ========== OTHER HIGH-IMPACT EVENTS ==========
  {
    id: 'geopolitical-crisis',
    name: 'Geopolitical Crisis/War',
    category: 'other',
    country: 'GLOBAL',
    description: 'Major geopolitical events affecting markets'
  },
  {
    id: 'financial-crisis',
    name: 'Financial Crisis/Bank Failure',
    category: 'other',
    country: 'GLOBAL',
    description: 'Major financial institution failures'
  },
  {
    id: 'natural-disaster',
    name: 'Natural Disaster',
    category: 'other',
    country: 'GLOBAL',
    description: 'Major natural disasters affecting markets'
  },
  {
    id: 'pandemic',
    name: 'Pandemic/Health Crisis',
    category: 'other',
    country: 'GLOBAL',
    description: 'Global health emergencies'
  }
]

// Helper functions
export function getNewsByCategory(category: NewsEvent['category']): NewsEvent[] {
  return MAJOR_NEWS_EVENTS.filter(event => event.category === category)
}

export function getNewsByCountry(country: NewsEvent['country']): NewsEvent[] {
  return MAJOR_NEWS_EVENTS.filter(event => event.country === country || event.country === 'GLOBAL')
}

export function getNewsById(id: string): NewsEvent | undefined {
  return MAJOR_NEWS_EVENTS.find(event => event.id === id)
}

export function searchNews(query: string): NewsEvent[] {
  const lowerQuery = query.toLowerCase()
  return MAJOR_NEWS_EVENTS.filter(event => 
    event.name.toLowerCase().includes(lowerQuery) ||
    event.description.toLowerCase().includes(lowerQuery)
  )
}

