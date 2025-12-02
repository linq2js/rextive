/**
 * CSS-in-JS styles for DevTools Panel
 * Bottom drawer layout - responsive for mobile
 */

// Font families
export const fontUI = '"Roboto", "Helvetica", "Arial", sans-serif';
export const fontMono =
  '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace';

export const colors = {
  bg: "#1a1a2e",
  bgLight: "#16213e",
  bgHover: "#0f3460",
  accent: "#e94560",
  accentHover: "#ff6b6b",
  text: "#eaeaea",
  textMuted: "#8892b0",
  textDim: "#5a6987",
  border: "#2a2a4a",
  success: "#4ecca3",
  warning: "#ffc107",
  error: "#e94560",
  errorBg: "rgba(233, 69, 96, 0.15)",
  errorText: "#ff6b6b",
  change: "#ffa502",
  changeBg: "rgba(255, 165, 2, 0.15)",
  mutable: "#4ecca3",
  computed: "#7b68ee",
  tag: "#ffa502",
};

// Panel dimensions for different states and positions
export const PANEL_SIZE_COLLAPSED = 40;
export const PANEL_SIZE_EXPANDED_BOTTOM = 280;
export const PANEL_SIZE_EXPANDED_LEFT = 320;
export const PANEL_MIN_SIZE_BOTTOM = 150;
export const PANEL_MAX_SIZE_BOTTOM = 600;
export const PANEL_MIN_SIZE_LEFT = 340;
export const PANEL_MAX_SIZE_LEFT = 500;

export type PanelPosition = "bottom" | "left";

export const panelContainerStyles = (
  position: PanelPosition
): React.CSSProperties => ({
  position: "fixed",
  ...(position === "bottom"
    ? { bottom: 0, left: 0, right: 0 }
    : { top: 0, left: 0, bottom: 0 }),
  zIndex: 99999,
  fontFamily: fontUI,
  fontSize: "12px",
  color: colors.text,
});

export const panelStyles = (
  isExpanded: boolean,
  position: PanelPosition,
  customSize?: number,
  isResizing?: boolean
): React.CSSProperties => {
  const isBottom = position === "bottom";
  const defaultSize = isBottom
    ? PANEL_SIZE_EXPANDED_BOTTOM
    : PANEL_SIZE_EXPANDED_LEFT;
  const expandedSize = customSize ?? defaultSize;

  return {
    backgroundColor: colors.bg,
    ...(isBottom
      ? {
          borderTop: `1px solid ${colors.border}`,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
          height: isExpanded ? expandedSize : PANEL_SIZE_COLLAPSED,
          width: "100%",
        }
      : {
          borderRight: `1px solid ${colors.border}`,
          boxShadow: "4px 0 20px rgba(0,0,0,0.3)",
          width: isExpanded ? expandedSize : PANEL_SIZE_COLLAPSED,
          height: "100%",
        }),
    // Disable transition while resizing for smooth drag
    transition: isResizing
      ? "none"
      : isBottom
      ? "height 0.2s ease-out"
      : "width 0.2s ease-out",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
};

export const headerStyles = (
  position: PanelPosition,
  isExpanded: boolean
): React.CSSProperties => {
  const isBottom = position === "bottom";
  const isLeftCollapsed = position === "left" && !isExpanded;

  return {
    padding: isLeftCollapsed ? "12px 8px" : "8px 12px",
    backgroundColor: colors.bgLight,
    borderBottom:
      isBottom || isExpanded ? `1px solid ${colors.border}` : "none",
    borderRight: isLeftCollapsed ? `1px solid ${colors.border}` : "none",
    display: "flex",
    flexDirection: isLeftCollapsed ? "column" : "row",
    alignItems: "center",
    justifyContent: isLeftCollapsed ? "flex-start" : "space-between",
    gap: isLeftCollapsed ? "12px" : "0",
    flexShrink: 0,
    minHeight: isBottom ? PANEL_SIZE_COLLAPSED - 1 : undefined,
    minWidth: isLeftCollapsed ? PANEL_SIZE_COLLAPSED - 1 : undefined,
    cursor: "pointer",
    userSelect: "none",
    ...(isLeftCollapsed && { height: "100%", width: PANEL_SIZE_COLLAPSED - 1 }),
  };
};

export const titleStyles = (
  vertical: boolean = false
): React.CSSProperties => ({
  margin: 0,
  fontSize: vertical ? "11px" : "13px",
  fontWeight: 600,
  color: colors.text,
  display: "flex",
  flexDirection: vertical ? "column" : "row",
  alignItems: "center",
  gap: vertical ? "4px" : "8px",
  ...(vertical && { writingMode: "vertical-rl", textOrientation: "mixed" }),
});

export const headerRightStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
};

export const tabsContainerStyles: React.CSSProperties = {
  display: "flex",
  gap: "0px",
  padding: "6px 8px",
  backgroundColor: colors.bgLight,
  borderBottom: `1px solid ${colors.border}`,
  flexShrink: 0,
  flexWrap: "wrap",
  alignItems: "center",
};

export const tabStyles = (active: boolean): React.CSSProperties => ({
  padding: "4px 8px",
  backgroundColor: active ? colors.bgHover : "transparent",
  color: active ? colors.text : colors.textMuted,
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 500,
  fontFamily: fontUI,
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
});

export const contentStyles: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "6px 8px",
};

export const contentGridStyles = (
  position: PanelPosition = "left"
): React.CSSProperties => ({
  display: "grid",
  // When at bottom, use wider min-width (320px) for better readability in horizontal layout
  gridTemplateColumns:
    position === "bottom"
      ? "repeat(auto-fill, minmax(320px, 1fr))"
      : "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "6px",
});

export const sectionStyles: React.CSSProperties = {
  marginBottom: "12px",
};

export const sectionTitleStyles: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: colors.textMuted,
  marginBottom: "6px",
};

export type FlashType = "change" | "create" | null;

export const itemStyles = (
  hovered: boolean,
  flash: FlashType = null,
  hasError: boolean = false
): React.CSSProperties => {
  const flashColor = flash === "create" ? colors.success : colors.change;
  const isFlashing = flash !== null;

  // Error state takes precedence over flash state for background
  const bgColor = hasError
    ? colors.errorBg
    : isFlashing
    ? flashColor + "33"
    : hovered
    ? colors.bgHover
    : colors.bgLight;

  // Error state takes precedence for border
  const borderColor = hasError
    ? colors.error
    : isFlashing
    ? flashColor
    : "transparent";

  return {
    padding: "6px 8px",
    backgroundColor: bgColor,
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    boxShadow: hasError
      ? `0 0 8px ${colors.error}44`
      : isFlashing
      ? `0 0 8px ${flashColor}44`
      : "none",
    borderLeft: `3px solid ${borderColor}`,
  };
};

export const itemHeaderStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "2px",
};

export const itemNameStyles: React.CSSProperties = {
  fontFamily: fontMono,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const badgeStyles = (
  type: "mutable" | "computed" | "tag"
): React.CSSProperties => ({
  fontSize: "8px",
  padding: "1px 4px",
  borderRadius: "3px",
  fontWeight: 600,
  flexShrink: 0,
  backgroundColor:
    type === "mutable"
      ? `${colors.mutable}22`
      : type === "computed"
      ? `${colors.computed}22`
      : `${colors.tag}22`,
  color:
    type === "mutable"
      ? colors.mutable
      : type === "computed"
      ? colors.computed
      : colors.tag,
});

export const valueStyles: React.CSSProperties = {
  fontFamily: fontMono,
  color: colors.textDim,
  fontSize: "10px",
  wordBreak: "break-all",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: "100%",
};

export const statsGridStyles: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
  gap: "6px",
};

export const statBoxStyles: React.CSSProperties = {
  padding: "8px",
  backgroundColor: colors.bgLight,
  borderRadius: "6px",
  textAlign: "center",
};

export const statValueStyles: React.CSSProperties = {
  fontFamily: fontMono,
  fontSize: "18px",
  fontWeight: 700,
  color: colors.text,
};

export const statLabelStyles: React.CSSProperties = {
  fontSize: "8px",
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  marginTop: "2px",
};

export const eventLogStyles: React.CSSProperties = {
  maxHeight: "160px",
  overflow: "auto",
};

export const eventItemStyles: React.CSSProperties = {
  padding: "4px 6px",
  backgroundColor: colors.bgLight,
  borderRadius: "3px",
  marginBottom: "3px",
  fontSize: "10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

export const eventTypeStyles = (
  type: string,
  isError?: boolean
): React.CSSProperties => ({
  fontSize: "8px",
  padding: "1px 4px",
  borderRadius: "2px",
  fontWeight: 600,
  flexShrink: 0,
  backgroundColor: isError
    ? `${colors.error}22`
    : type.includes("create")
    ? `${colors.success}22`
    : type.includes("dispose") || type.includes("remove")
    ? `${colors.error}22`
    : `${colors.warning}22`,
  color: isError
    ? colors.error
    : type.includes("create")
    ? colors.success
    : type.includes("dispose") || type.includes("remove")
    ? colors.error
    : colors.warning,
});

export const toggleButtonStyles: React.CSSProperties = {
  background: "none",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: 0,
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
  fontSize: "20px",
  width: "32px",
  height: "32px",
  flexShrink: 0,
};

export const positionButtonStyles: React.CSSProperties = {
  background: "none",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: 0,
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
  fontSize: "20px",
  opacity: 0.7,
  width: "32px",
  height: "32px",
  flexShrink: 0,
};

export const resetButtonStyles: React.CSSProperties = {
  background: "none",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: "4px 8px",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
  fontSize: "14px",
  opacity: 0.6,
  marginLeft: "auto",
  fontFamily: fontUI,
};

export const resizeHandleStyles = (
  position: PanelPosition,
  isResizing: boolean
): React.CSSProperties => {
  const isBottom = position === "bottom";

  return {
    position: "absolute",
    ...(isBottom
      ? {
          top: 0,
          left: 0,
          right: 0,
          height: "6px",
          cursor: "ns-resize",
        }
      : {
          top: 0,
          right: 0,
          bottom: 0,
          width: "6px",
          cursor: "ew-resize",
        }),
    backgroundColor: isResizing ? colors.accent : "transparent",
    transition: "background-color 0.15s ease",
    zIndex: 10,
    // Hover effect
    ...(isResizing
      ? {}
      : {
          "&:hover": {
            backgroundColor: colors.border,
          },
        }),
  };
};

export const resizeHandleGripStyles = (
  position: PanelPosition
): React.CSSProperties => {
  const isBottom = position === "bottom";

  return {
    position: "absolute",
    ...(isBottom
      ? {
          top: "2px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "40px",
          height: "3px",
        }
      : {
          right: "2px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "3px",
          height: "40px",
        }),
    backgroundColor: colors.border,
    borderRadius: "2px",
    opacity: 0.5,
  };
};

export const closeButtonStyles: React.CSSProperties = {
  background: "none",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: "4px",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 0.15s ease",
};

export const emptyStateStyles: React.CSSProperties = {
  textAlign: "center",
  padding: "16px",
  color: colors.textMuted,
  fontSize: "11px",
};

export const warningBoxStyles: React.CSSProperties = {
  padding: "12px",
  backgroundColor: `${colors.warning}11`,
  border: `1px solid ${colors.warning}44`,
  borderRadius: "6px",
  color: colors.warning,
  textAlign: "center",
  fontSize: "11px",
};

export const checkboxLabelStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "10px",
  color: colors.textMuted,
  cursor: "pointer",
  userSelect: "none",
  marginLeft: "auto",
  whiteSpace: "nowrap",
};

export const checkboxStyles: React.CSSProperties = {
  width: "12px",
  height: "12px",
  accentColor: colors.accent,
  cursor: "pointer",
};

// Stats badge in header
export const headerStatsStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "10px",
  color: colors.textMuted,
};

export const headerStatBadgeStyles = (
  type: "mutable" | "computed" | "tag"
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "3px",
  padding: "2px 6px",
  borderRadius: "10px",
  backgroundColor: colors.bgHover,
  color:
    type === "mutable"
      ? colors.mutable
      : type === "computed"
      ? colors.computed
      : colors.tag,
  fontSize: "10px",
  fontWeight: 500,
});

// Search box styles
export const searchContainerStyles: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
  flexShrink: 0,
};

export const searchBoxStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: colors.bgLight,
  borderRadius: "4px",
  padding: "0 8px",
  border: `1px solid ${colors.border}`,
  transition: "border-color 0.2s ease",
};

export const searchIconStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  color: colors.textMuted,
  marginRight: "6px",
  flexShrink: 0,
};

export const searchInputStyles: React.CSSProperties = {
  flex: 1,
  backgroundColor: "transparent",
  border: "none",
  outline: "none",
  color: colors.text,
  fontSize: "11px",
  padding: "6px 0",
  fontFamily: fontMono,
};

export const searchClearStyles: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: "2px 4px",
  fontSize: "10px",
  borderRadius: "2px",
  marginLeft: "4px",
  transition: "all 0.15s ease",
};

// Signal action button styles
export const signalActionButtonStyles: React.CSSProperties = {
  backgroundColor: colors.bgHover,
  border: `1px solid ${colors.border}`,
  color: colors.textMuted,
  cursor: "pointer",
  padding: 0,
  fontSize: "11px",
  borderRadius: "4px",
  transition: "all 0.15s ease",
  fontFamily: fontUI,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "22px",
  height: "22px",
  flexShrink: 0,
};

export const signalActionsContainerStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  flexShrink: 0,
};

// Modal overlay styles
export const modalOverlayStyles: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  zIndex: 100000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

// Modal container styles
export const modalContainerStyles: React.CSSProperties = {
  backgroundColor: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: "8px",
  maxWidth: "600px",
  maxHeight: "80vh",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  overflow: "hidden",
};

// Modal header styles
export const modalHeaderStyles: React.CSSProperties = {
  padding: "16px 20px",
  borderBottom: `1px solid ${colors.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

// Modal title styles
export const modalTitleStyles: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: colors.text,
  margin: 0,
};

// Modal close button styles
export const modalCloseButtonStyles: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
  transition: "all 0.15s ease",
};

// Modal content styles
export const modalContentStyles: React.CSSProperties = {
  padding: "20px",
  overflowY: "auto",
  flex: 1,
};

// Help section styles
export const helpSectionStyles: React.CSSProperties = {
  marginBottom: "24px",
};

export const helpSectionTitleStyles: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  color: colors.text,
  marginBottom: "12px",
  marginTop: 0,
};

export const helpExampleStyles: React.CSSProperties = {
  backgroundColor: colors.bgLight,
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  padding: "12px",
  fontFamily: fontMono,
  fontSize: "12px",
  color: colors.text,
  marginBottom: "8px",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export const helpDescriptionStyles: React.CSSProperties = {
  fontSize: "12px",
  color: colors.textMuted,
  lineHeight: "1.6",
  marginBottom: "12px",
};

export const helpListStyles: React.CSSProperties = {
  margin: 0,
  paddingLeft: "20px",
  color: colors.textMuted,
  fontSize: "12px",
  lineHeight: "1.8",
};
