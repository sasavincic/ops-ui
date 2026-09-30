"use client";

// The kit's runtime configuration (spec §6.1): the words it says, how it
// translates a server refusal, and the UI language. Each app mounts
// OpsUiProvider inside its own I18nProvider, so every place that mounts the
// dictionary mounts the kit config too. useOpsUi() never throws: outside a
// provider (a root-layout Toaster, a login page) the kit speaks English and
// passes messages through unchanged.

import { createContext, useContext, useMemo } from "react";
import { EN_STRINGS, type OpsUiStrings } from "./strings";

export type OpsUiConfig = {
  /** The words the kit says; default EN_STRINGS. */
  strings: OpsUiStrings;
  /**
   * Translates a message that arrives in English (a server refusal: the
   * sentence is the key); default identity. Used by Field and the toast hooks.
   */
  localize: (text: string) => string;
  /** The UI language, for MonthNav's Intl month names. 1.x only; removed in 2.0. */
  locale: string;
};

const identity = (text: string) => text;

const DEFAULTS: OpsUiConfig = { strings: EN_STRINGS, localize: identity, locale: "en" };

const OpsUiContext = createContext<OpsUiConfig>(DEFAULTS);

export function OpsUiProvider({
  strings,
  localize,
  locale,
  children,
}: Partial<OpsUiConfig> & { children: React.ReactNode }) {
  const value = useMemo<OpsUiConfig>(
    () => ({
      strings: strings ?? DEFAULTS.strings,
      localize: localize ?? DEFAULTS.localize,
      locale: locale ?? DEFAULTS.locale,
    }),
    [strings, localize, locale]
  );
  return <OpsUiContext.Provider value={value}>{children}</OpsUiContext.Provider>;
}

/** The kit config; the defaults outside a provider. */
export function useOpsUi(): OpsUiConfig {
  return useContext(OpsUiContext);
}
