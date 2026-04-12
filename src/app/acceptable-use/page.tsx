"use client";

import { useLanguage } from "@/hooks/use-language";
import { PolicyLayout } from "@/components/layout/policy-layout";

export default function AcceptableUsePage() {
  const { t } = useLanguage();

  return (
    <PolicyLayout titleKey="policy.aupTitle" lastUpdated="2026-04-01">
      <p>{t("policy.aupIntro")}</p>

      <h2>{t("policy.aupPermitted")}</h2>
      <ul>
        <li>{t("policy.aupPermittedResearch")}</li>
        <li>{t("policy.aupPermittedBusiness")}</li>
        <li>{t("policy.aupPermittedAnalysis")}</li>
      </ul>

      <h2>{t("policy.aupProhibited")}</h2>
      <ul>
        <li>{t("policy.aupNoResell")}</li>
        <li>{t("policy.aupNoHarm")}</li>
        <li>{t("policy.aupNoSpam")}</li>
        <li>{t("policy.aupNoScrape")}</li>
        <li>{t("policy.aupNoCircumvent")}</li>
      </ul>

      <h2>{t("policy.aupEnforcement")}</h2>
      <p>{t("policy.aupEnforcementDesc")}</p>

      <h2>{t("policy.aupReporting")}</h2>
      <p>{t("policy.aupReportingDesc")}</p>
    </PolicyLayout>
  );
}
