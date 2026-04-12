"use client";

import { useLanguage } from "@/hooks/use-language";
import { PolicyLayout } from "@/components/layout/policy-layout";

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <PolicyLayout titleKey="policy.privacyTitle" lastUpdated="2026-04-01">
      <p>{t("policy.privacyIntro")}</p>

      <h2>{t("policy.dataCollection")}</h2>
      <p>{t("policy.dataCollectionDesc")}</p>
      <ul>
        <li>{t("policy.dataName")}</li>
        <li>{t("policy.dataEmail")}</li>
        <li>{t("policy.dataPayment")}</li>
        <li>{t("policy.dataUsage")}</li>
        <li>{t("policy.dataDevice")}</li>
      </ul>

      <h2>{t("policy.dataUse")}</h2>
      <p>{t("policy.dataUseDesc")}</p>
      <ul>
        <li>{t("policy.dataUseProvide")}</li>
        <li>{t("policy.dataUseProcess")}</li>
        <li>{t("policy.dataUseImprove")}</li>
        <li>{t("policy.dataUseCommunicate")}</li>
        <li>{t("policy.dataUseProtect")}</li>
      </ul>

      <h2>{t("policy.dataSharing")}</h2>
      <p>{t("policy.dataSharingDesc")}</p>

      <h2>{t("policy.dataSecurity")}</h2>
      <p>{t("policy.dataSecurityDesc")}</p>

      <h2>{t("policy.userRights")}</h2>
      <p>{t("policy.userRightsDesc")}</p>
      <ul>
        <li>{t("policy.rightAccess")}</li>
        <li>{t("policy.rightCorrect")}</li>
        <li>{t("policy.rightDelete")}</li>
        <li>{t("policy.rightExport")}</li>
      </ul>

      <h2>{t("policy.contact")}</h2>
      <p>{t("policy.contactDesc")}</p>
    </PolicyLayout>
  );
}
