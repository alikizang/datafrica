"use client";

import { useLanguage } from "@/hooks/use-language";
import { PolicyLayout } from "@/components/layout/policy-layout";

export default function RefundPage() {
  const { t } = useLanguage();

  return (
    <PolicyLayout titleKey="policy.refundTitle" lastUpdated="2026-04-01">
      <p>{t("policy.refundIntro")}</p>

      <h2>{t("policy.refundDigital")}</h2>
      <p>{t("policy.refundDigitalDesc")}</p>

      <h2>{t("policy.refundEligible")}</h2>
      <p>{t("policy.refundEligibleDesc")}</p>
      <ul>
        <li>{t("policy.refundCorrupt")}</li>
        <li>{t("policy.refundMismatch")}</li>
        <li>{t("policy.refundDuplicate")}</li>
      </ul>

      <h2>{t("policy.refundProcess")}</h2>
      <p>{t("policy.refundProcessDesc")}</p>

      <h2>{t("policy.refundSubscriptions")}</h2>
      <p>{t("policy.refundSubscriptionsDesc")}</p>

      <h2>{t("policy.refundContact")}</h2>
      <p>{t("policy.refundContactDesc")}</p>
    </PolicyLayout>
  );
}
