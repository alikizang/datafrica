"use client";

import { useLanguage } from "@/hooks/use-language";
import { PolicyLayout } from "@/components/layout/policy-layout";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <PolicyLayout titleKey="policy.termsTitle" lastUpdated="2026-04-01">
      <p>{t("policy.termsIntro")}</p>

      <h2>{t("policy.termsAcceptance")}</h2>
      <p>{t("policy.termsAcceptanceDesc")}</p>

      <h2>{t("policy.termsAccount")}</h2>
      <p>{t("policy.termsAccountDesc")}</p>

      <h2>{t("policy.termsPurchases")}</h2>
      <p>{t("policy.termsPurchasesDesc")}</p>
      <ul>
        <li>{t("policy.termsLicensePersonal")}</li>
        <li>{t("policy.termsNoRedistribute")}</li>
        <li>{t("policy.termsNoResell")}</li>
      </ul>

      <h2>{t("policy.termsProhibited")}</h2>
      <ul>
        <li>{t("policy.termsNoScraping")}</li>
        <li>{t("policy.termsNoAbuse")}</li>
        <li>{t("policy.termsNoViolate")}</li>
        <li>{t("policy.termsNoImpersonate")}</li>
      </ul>

      <h2>{t("policy.termsTermination")}</h2>
      <p>{t("policy.termsTerminationDesc")}</p>

      <h2>{t("policy.termsLiability")}</h2>
      <p>{t("policy.termsLiabilityDesc")}</p>

      <h2>{t("policy.termsChanges")}</h2>
      <p>{t("policy.termsChangesDesc")}</p>
    </PolicyLayout>
  );
}
