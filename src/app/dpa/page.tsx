"use client";

import { useLanguage } from "@/hooks/use-language";
import { PolicyLayout } from "@/components/layout/policy-layout";

export default function DpaPage() {
  const { t } = useLanguage();

  return (
    <PolicyLayout titleKey="policy.dpaTitle" lastUpdated="2026-04-01">
      <p>{t("policy.dpaIntro")}</p>

      <h2>{t("policy.dpaDefinitions")}</h2>
      <p>{t("policy.dpaDefinitionsDesc")}</p>

      <h2>{t("policy.dpaScope")}</h2>
      <p>{t("policy.dpaScopeDesc")}</p>

      <h2>{t("policy.dpaObligations")}</h2>
      <ul>
        <li>{t("policy.dpaObProcess")}</li>
        <li>{t("policy.dpaObSecure")}</li>
        <li>{t("policy.dpaObNotify")}</li>
        <li>{t("policy.dpaObDelete")}</li>
      </ul>

      <h2>{t("policy.dpaTransfers")}</h2>
      <p>{t("policy.dpaTransfersDesc")}</p>

      <h2>{t("policy.dpaBreach")}</h2>
      <p>{t("policy.dpaBreachDesc")}</p>

      <h2>{t("policy.dpaTermination")}</h2>
      <p>{t("policy.dpaTerminationDesc")}</p>
    </PolicyLayout>
  );
}
