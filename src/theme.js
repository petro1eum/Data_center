/**
 * Ant Design 5 theme — Interfera Design System.
 * Maps the brand book tokens (claude.ai/design · "Interfera Design System")
 * onto AntD's token system. Crimson primary, brand semantic colors,
 * Inter/Outfit type, slate borders, soft radii. Signature gradient buttons
 * and card hover-lift live in index.css (cannot be expressed as tokens).
 */
export const interferaTheme = {
  token: {
    // Brand + semantic
    colorPrimary: '#ef4444',   // crimson accent
    colorSuccess: '#047857',
    colorWarning: '#f97316',   // brand orange
    colorError: '#b91c1c',     // brand danger
    colorInfo: '#3b82f6',      // trust blue

    // Ink + surfaces (navy ink over white / slate)
    colorTextBase: '#0f172a',
    colorTextHeading: '#0f172a',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#94a3b8',
    colorBgBase: '#ffffff',
    colorBgLayout: '#f8fafc',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',

    // Links
    colorLink: '#ef4444',
    colorLinkHover: '#e11d48',
    colorLinkActive: '#e11d48',

    // Type
    fontFamily: "'Inter', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,

    // Shape
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // Focus / selection accents
    controlItemBgActive: '#fff1f2',
    controlOutline: 'rgba(239, 68, 68, 0.12)',
    boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
  },
  components: {
    Layout: {
      headerBg: '#0f172a',
      bodyBg: '#f8fafc',
      footerBg: '#f8fafc',
    },
    Card: {
      borderRadiusLG: 12,
      colorBorderSecondary: '#e2e8f0',
    },
    Button: {
      fontWeight: 600,
      primaryShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
      borderRadius: 8,
    },
    Tabs: {
      inkBarColor: '#ef4444',
      itemSelectedColor: '#ef4444',
      itemActiveColor: '#ef4444',
      itemHoverColor: '#e11d48',
      titleFontSize: 14,
    },
    Segmented: {
      itemSelectedBg: '#ef4444',
      itemSelectedColor: '#ffffff',
    },
    Progress: {
      defaultColor: '#ef4444',
    },
    Slider: {
      trackBg: '#fca5a5',
      trackHoverBg: '#ef4444',
      handleColor: '#ef4444',
    },
    Switch: {
      colorPrimary: '#ef4444',
    },
    Menu: {
      itemSelectedBg: '#fff1f2',
      itemSelectedColor: '#ef4444',
    },
  },
};
