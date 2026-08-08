import type { EnterpriseSystem } from "../../organization/types";
import { ORG_ID } from "./organization";

export const ES_SAP = "es-sap-s4hana";
export const ES_COUPA = "es-coupa";
export const ES_SERVICENOW = "es-servicenow";

export const demoEnterpriseSystems: EnterpriseSystem[] = [
  { id: ES_SAP, organization_id: ORG_ID, name: "SAP S/4HANA", type: "erp", status: "connected", created_at: "2025-02-06T09:00:00Z" },
  { id: ES_COUPA, organization_id: ORG_ID, name: "Coupa", type: "procurement", status: "connected", created_at: "2025-02-06T09:00:00Z" },
  { id: ES_SERVICENOW, organization_id: ORG_ID, name: "ServiceNow", type: "other", status: "connected", created_at: "2025-02-06T09:00:00Z" },
];
