"use client";

import { useLanguage } from "@/hooks/use-language";
import { PolicyLayout } from "@/components/layout/policy-layout";

export default function CookiesPage() {
  const { t } = useLanguage();

  return (
    <PolicyLayout titleKey="policy.cookiesTitle" lastUpdated="2026-04-01">
      <p>{t("policy.cookiesIntro")}</p>

      <h2>{t("policy.cookiesWhat")}</h2>
      <p>{t("policy.cookiesWhatDesc")}</p>

      <h2>{t("policy.cookiesTypes")}</h2>
      <h3>{t("policy.cookiesEssential")}</h3>
      <p>{t("policy.cookiesEssentialDesc")}</p>
      <h3>{t("policy.cookiesAnalytics")}</h3>
      <p>{t("policy.cookiesAnalyticsDesc")}</p>
      <h3>{t("policy.cookiesPreferences")}</h3>
      <p>{t("policy.cookiesPreferencesDesc")}</p>

      <h2>{t("policy.cookiesManage")}</h2>
      <p>{t("policy.cookiesManageDesc")}</p>

      <h2>{t("policy.cookiesThirdParty")}</h2>
      <p>{t("policy.cookiesThirdPartyDesc")}</p>
    </PolicyLayout>
  );
}
