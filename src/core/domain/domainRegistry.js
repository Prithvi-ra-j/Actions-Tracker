/** Canonical domain/entity registry for Actions-Tracker 2.0. */
export const CANONICAL_DOMAINS = Object.freeze(['body','discipline','knowledge','social','creativity','strategy','general']);
export const ENTITY_REGISTRY = Object.freeze({
  intent:{owner:'user',mutable:true,history:'versioned'}, goal:{owner:'user',mutable:true,history:'versioned'}, action:{owner:'user',mutable:true,history:'versioned'},
  evidence:{owner:'system',mutable:false,history:'append_only'}, pattern:{owner:'system',mutable:false,history:'derived'}, insight:{owner:'system',mutable:true,history:'derived'},
});
export const LEGACY_DOMAIN_MAP = Object.freeze({strength:'body',wisdom:'strategy',art:'creativity',philosophy:'knowledge',history:'strategy'});
export const LEGACY_ENTITY_MAP = Object.freeze({lifeObjects:'goal',habits:'action',questBoard:'action',logs:'evidence',facts:'evidence_source',evidence:'evidence',insights:'insight',audits:'insight'});
export function canonicalDomain(value,fallback='general'){if(typeof value!=='string')return fallback;const n=value.trim().toLowerCase();return LEGACY_DOMAIN_MAP[n] ?? (CANONICAL_DOMAINS.includes(n)?n:fallback);}
export function canonicalEntityForStore(storeName){return LEGACY_ENTITY_MAP[storeName]??null;}
export function getDomainRegistry(){return {domains:[...CANONICAL_DOMAINS],entities:JSON.parse(JSON.stringify(ENTITY_REGISTRY)),legacyDomains:{...LEGACY_DOMAIN_MAP},legacyEntities:{...LEGACY_ENTITY_MAP}};}
