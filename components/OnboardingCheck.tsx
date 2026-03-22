"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const OnboardingWizard = dynamic(() => import("@/components/OnboardingWizard"), { ssr: false });

export default function OnboardingCheck() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const done = localStorage.getItem("so:onboarded");
    if (done === "1") { setChecked(true); return; }

    // Check if profile exists in DB
    fetch("/api/profile", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d?.profile?.full_name) {
          localStorage.setItem("so:onboarded", "1");
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked || !showOnboarding) return null;

  return (
    <OnboardingWizard
      onComplete={() => {
        localStorage.setItem("so:onboarded", "1");
        setShowOnboarding(false);
      }}
    />
  );
}
