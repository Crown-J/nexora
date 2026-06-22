/* @ds-bundle: {"format":3,"namespace":"NEXORAGRIDDesignSystem_6998e4","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"CardTitle","sourcePath":"components/core/Card.jsx"},{"name":"CardDescription","sourcePath":"components/core/Card.jsx"},{"name":"CardContent","sourcePath":"components/core/Card.jsx"},{"name":"CardFooter","sourcePath":"components/core/Card.jsx"},{"name":"DocStatusBadge","sourcePath":"components/erp/DocStatusBadge.jsx"},{"name":"PlanBadge","sourcePath":"components/erp/PlanBadge.jsx"},{"name":"StatCard","sourcePath":"components/erp/StatCard.jsx"},{"name":"ToolbarButton","sourcePath":"components/erp/ToolbarButton.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FieldBadge","sourcePath":"components/forms/FieldBadge.jsx"},{"name":"FormField","sourcePath":"components/forms/FormField.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"276326dec1b2","components/core/Button.jsx":"084c0173bb86","components/core/Card.jsx":"59f38c611cad","components/erp/DocStatusBadge.jsx":"f5f27325ce30","components/erp/PlanBadge.jsx":"3fbd64c6ac16","components/erp/StatCard.jsx":"913ce431f97c","components/erp/ToolbarButton.jsx":"cd126e8599c6","components/forms/Checkbox.jsx":"1d4c88c06d97","components/forms/FieldBadge.jsx":"ab157f99a742","components/forms/FormField.jsx":"2139b1738086","components/forms/Input.jsx":"0278ee1e8280","components/forms/Select.jsx":"dc65599d508b","ui_kits/erp/App.jsx":"654a176eea21","ui_kits/erp/DocumentScreen.jsx":"55f9de80d57b","ui_kits/erp/HomeScreen.jsx":"42906a8fe2bb","ui_kits/erp/Icons.jsx":"49323f283a40","ui_kits/erp/LoginScreen.jsx":"90e7ff0bfd42","ui_kits/erp/MasterScreen.jsx":"658806910ba7","ui_kits/erp/TopBar.jsx":"3be11cea5f84","ui_kits/erp/data.js":"e256cc78bcc0","ui_kits/erp/fallback.jsx":"ef5e5b4ba993","ui_kits/purchase/PoApp.jsx":"d56cf0059837","ui_kits/purchase/PoDetailScreen.jsx":"e73f3a90acae","ui_kits/purchase/PoListScreen.jsx":"2c574fd50e9f","ui_kits/purchase/PoParts.jsx":"d4ea49632481","ui_kits/purchase/data.js":"9eec0b082766"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.NEXORAGRIDDesignSystem_6998e4 = window.NEXORAGRIDDesignSystem_6998e4 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — Badge
 * Compact label. Variants: default (gold), secondary, destructive, outline,
 * success, warning, info — the last three map to NEXORA business semantics.
 */

const VARIANTS = {
  default: {
    background: 'var(--primary)',
    color: 'var(--primary-foreground)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'var(--secondary)',
    color: 'var(--secondary-foreground)',
    border: '1px solid transparent'
  },
  destructive: {
    background: 'var(--destructive)',
    color: '#fff',
    border: '1px solid transparent'
  },
  outline: {
    background: 'transparent',
    color: 'var(--foreground)',
    border: '1px solid var(--border)'
  },
  success: {
    background: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
    color: 'var(--color-success)',
    border: '1px solid color-mix(in srgb, var(--color-success) 35%, transparent)'
  },
  warning: {
    background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
    color: 'var(--warning)',
    border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)'
  },
  info: {
    background: 'color-mix(in srgb, var(--color-meeting) 18%, transparent)',
    color: 'var(--color-meeting)',
    border: '1px solid color-mix(in srgb, var(--color-meeting) 35%, transparent)'
  }
};
function Badge({
  variant = 'default',
  className = '',
  style = {},
  children,
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      borderRadius: 'var(--radius-md)',
      padding: '2px 8px',
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      width: 'fit-content',
      ...v,
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — Button
 * shadcn-derived button with the NEXORA amber-gold primary. Variants:
 * default (gold), secondary, outline, ghost, destructive, link.
 * Sizes: sm, default, lg, icon, icon-sm, icon-lg.
 */

const SIZES = {
  sm: {
    height: 'var(--control-h-sm)',
    padding: '0 12px',
    fontSize: '12px',
    gap: '6px'
  },
  default: {
    height: 'var(--control-h)',
    padding: '0 16px',
    fontSize: '14px',
    gap: '8px'
  },
  lg: {
    height: 'var(--control-h-lg)',
    padding: '0 24px',
    fontSize: '15px',
    gap: '8px'
  },
  icon: {
    height: 'var(--control-h)',
    width: 'var(--control-h)',
    padding: 0,
    gap: 0
  },
  'icon-sm': {
    height: 'var(--control-h-sm)',
    width: 'var(--control-h-sm)',
    padding: 0,
    gap: 0
  },
  'icon-lg': {
    height: 'var(--control-h-lg)',
    width: 'var(--control-h-lg)',
    padding: 0,
    gap: 0
  }
};
const VARIANTS = {
  default: {
    background: 'var(--primary)',
    color: 'var(--primary-foreground)',
    border: '1px solid transparent'
  },
  secondary: {
    background: 'var(--secondary)',
    color: 'var(--secondary-foreground)',
    border: '1px solid transparent'
  },
  outline: {
    background: 'transparent',
    color: 'var(--foreground)',
    border: '1px solid var(--border)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--foreground)',
    border: '1px solid transparent'
  },
  destructive: {
    background: 'var(--destructive)',
    color: '#fff',
    border: '1px solid transparent'
  },
  link: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid transparent',
    textDecoration: 'underline',
    textUnderlineOffset: '4px'
  }
};
function Button({
  variant = 'default',
  size = 'default',
  disabled = false,
  type = 'button',
  className = '',
  style = {},
  children,
  ...props
}) {
  const s = SIZES[size] || SIZES.default;
  const v = VARIANTS[variant] || VARIANTS.default;
  const [hover, setHover] = React.useState(false);
  const hoverStyle = !disabled && hover ? {
    default: {
      filter: 'brightness(0.92)'
    },
    secondary: {
      background: 'color-mix(in oklch, var(--secondary) 80%, transparent)'
    },
    outline: {
      background: 'var(--secondary)'
    },
    ghost: {
      background: 'color-mix(in oklch, var(--accent) 18%, transparent)'
    },
    destructive: {
      filter: 'brightness(0.92)'
    },
    link: {}
  }[variant] : {};
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'filter var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)',
      fontSize: s.fontSize,
      height: s.height,
      width: s.width,
      padding: s.padding,
      gap: s.gap,
      ...v,
      ...hoverStyle,
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — Card family
 * Card surface + structured slots (Header / Title / Description / Content /
 * Footer). `glass` makes it a frosted reactor-sky panel with inset highlight.
 */

function Card({
  glass = false,
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      borderRadius: 'var(--radius-2xl)',
      padding: '20px',
      background: glass ? 'var(--nx-glass-bg)' : 'var(--card)',
      color: 'var(--card-foreground)',
      border: glass ? '1px solid var(--nx-glass-border)' : '1px solid var(--border)',
      boxShadow: glass ? 'var(--shadow-lg), var(--highlight-top)' : 'var(--shadow-sm)',
      backdropFilter: glass ? 'var(--nx-glass-blur)' : undefined,
      WebkitBackdropFilter: glass ? 'var(--nx-glass-blur)' : undefined,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, props), children);
}
function CardHeader({
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      ...style
    }
  }, props), children);
}
function CardTitle({
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.2,
      color: 'var(--foreground)',
      ...style
    }
  }, props), children);
}
function CardDescription({
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      fontSize: '13px',
      color: 'var(--muted-foreground)',
      ...style
    }
  }, props), children);
}
function CardContent({
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      fontSize: '14px',
      color: 'var(--card-foreground)',
      ...style
    }
  }, props), children);
}
function CardFooter({
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/erp/DocStatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — DocStatusBadge
 * Single-document workflow status. Status letters map to the doc lifecycle:
 *   D 草稿 · S 已送出 · R 已回覆 · B 退回 · C 完成 · P 過帳 · V/X 作廢
 * Pass a Chinese `label`; the letter drives the color.
 */
const STYLES = {
  D: {
    bg: 'var(--muted)',
    fg: 'var(--muted-foreground)',
    line: false
  },
  S: {
    bg: 'color-mix(in srgb, var(--color-meeting) 22%, transparent)',
    fg: 'var(--color-meeting)',
    line: false
  },
  R: {
    bg: 'color-mix(in srgb, var(--warning) 20%, transparent)',
    fg: 'var(--warning)',
    line: false
  },
  B: {
    bg: 'color-mix(in srgb, var(--warning) 20%, transparent)',
    fg: 'var(--warning)',
    line: false
  },
  C: {
    bg: 'color-mix(in srgb, var(--color-success) 22%, transparent)',
    fg: 'var(--color-success)',
    line: false
  },
  P: {
    bg: 'color-mix(in srgb, var(--color-success) 22%, transparent)',
    fg: 'var(--color-success)',
    line: false
  },
  V: {
    bg: 'var(--muted)',
    fg: 'var(--muted-foreground)',
    line: true
  },
  X: {
    bg: 'var(--muted)',
    fg: 'var(--muted-foreground)',
    line: true
  }
};
function DocStatusBadge({
  status = 'D',
  label,
  className = '',
  style = {},
  ...props
}) {
  const s = STYLES[String(status).toUpperCase()] || STYLES.D;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 'var(--radius-md)',
      background: s.bg,
      color: s.fg,
      padding: '2px 8px',
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      fontWeight: 600,
      textDecoration: s.line ? 'line-through' : 'none',
      ...style
    }
  }, props), label ?? status);
}
Object.assign(__ds_scope, { DocStatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/erp/DocStatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/erp/PlanBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — PlanBadge
 * The tenant tier chip (LITE / PLUS / PRO) shown in the TopBar. Gold outline;
 * PRO gets a filled tint. Tiers differ only by seat cap, never module access.
 */
const PLAN = {
  LITE: {
    borderColor: 'var(--nx-amber)',
    color: 'var(--nx-amber)',
    background: 'transparent'
  },
  PLUS: {
    borderColor: 'var(--nx-amber)',
    color: 'var(--nx-amber-bright)',
    background: 'transparent'
  },
  PRO: {
    borderColor: 'var(--nx-amber)',
    color: 'var(--nx-amber-bright)',
    background: 'var(--color-primary-bg)'
  }
};
function PlanBadge({
  plan = 'PRO',
  className = '',
  style = {},
  ...props
}) {
  const p = PLAN[plan] || PLAN.PRO;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 'var(--radius-md)',
      border: `2px solid ${p.borderColor}`,
      background: p.background,
      color: p.color,
      padding: '1px 8px',
      fontFamily: 'var(--font-sans)',
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      ...style
    }
  }, props), plan);
}
Object.assign(__ds_scope, { PlanBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/erp/PlanBadge.jsx", error: String((e && e.message) || e) }); }

// components/erp/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — StatCard
 * Dashboard KPI tile: glass surface, uppercase category eyebrow, label, a big
 * tabular value, and an optional delta. The home metrics row is built of these.
 */
function StatCard({
  category,
  label,
  value,
  unit,
  delta,
  deltaDir = 'up',
  className = '',
  style = {},
  ...props
}) {
  const deltaColor = deltaDir === 'down' ? 'var(--color-danger)' : 'var(--color-success)';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      minHeight: '116px',
      padding: '16px',
      borderRadius: 'var(--radius-2xl)',
      background: 'var(--nx-glass-bg)',
      border: '1px solid color-mix(in oklch, var(--border) 80%, transparent)',
      boxShadow: 'var(--shadow-lg), var(--highlight-top)',
      backdropFilter: 'var(--nx-glass-blur)',
      WebkitBackdropFilter: 'var(--nx-glass-blur)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, category && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '10px',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wider)',
      color: 'var(--muted-foreground)'
    }
  }, category), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 2,
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      fontSize: '28px',
      fontWeight: 600,
      color: 'var(--foreground)'
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--muted-foreground)'
    }
  }, unit), delta && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: '12px',
      fontWeight: 600,
      color: deltaColor
    }
  }, deltaDir === 'down' ? '▼' : '▲', " ", delta)));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/erp/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/erp/ToolbarButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — ToolbarButton
 * The signature ERP toolbar control: a mono hot-key letter chip + icon +
 * label. Variants: default, danger (停用/刪除), accent (call-to-action like
 * 存檔). `pressed` marks a toggle-on state. `letter` is the Alt-shortcut key.
 */
function ToolbarButton({
  letter,
  label,
  icon = null,
  variant = 'default',
  accent = false,
  pressed = false,
  disabled = false,
  className = '',
  style = {},
  ...props
}) {
  const [hover, setHover] = React.useState(false);
  const amberActive = !disabled && (accent || pressed);
  let palette;
  if (disabled) {
    palette = {
      border: 'color-mix(in oklch, var(--border) 50%, transparent)',
      bg: 'color-mix(in oklch, var(--card) 60%, transparent)',
      fg: 'var(--muted-foreground)'
    };
  } else if (variant === 'danger') {
    palette = {
      border: 'color-mix(in srgb, var(--color-danger) 45%, var(--border))',
      bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
      fg: 'var(--color-danger)'
    };
  } else if (amberActive) {
    palette = {
      border: 'color-mix(in srgb, var(--nx-amber) 40%, transparent)',
      bg: 'color-mix(in srgb, var(--nx-amber) 14%, transparent)',
      fg: 'var(--nx-amber)'
    };
  } else {
    palette = {
      border: 'var(--border)',
      bg: 'color-mix(in oklch, var(--card) 80%, transparent)',
      fg: 'var(--foreground)'
    };
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      height: 'var(--control-h-sm)',
      padding: '0 9px',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${palette.border}`,
      background: palette.bg,
      color: palette.fg,
      fontFamily: 'var(--font-sans)',
      fontSize: '12px',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      filter: hover && !disabled ? 'brightness(1.15)' : 'none',
      transition: 'filter var(--dur-fast), background var(--dur-fast)',
      ...style
    }
  }, props), icon, letter && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 600,
      color: !disabled && variant !== 'danger' && !amberActive ? 'var(--nx-amber)' : 'inherit'
    }
  }, letter), /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { ToolbarButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/erp/ToolbarButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — Checkbox
 * Master-table style checkbox with the amber accent. Supports indeterminate.
 */
function Checkbox({
  checked = false,
  indeterminate = false,
  label,
  disabled = false,
  onChange,
  className = '',
  style = {},
  ...props
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const box = /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      width: '16px',
      height: '16px',
      flexShrink: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: '4px',
      accentColor: 'var(--primary)',
      ...style
    }
  }, props));
  if (!label) return box;
  return /*#__PURE__*/React.createElement("label", {
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
      color: 'var(--foreground)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }
  }, box, /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FieldBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — FieldBadge
 * The four fixed field-semantic chips used beside form labels across every
 * document: 必填 (required) · 建立後不可改 (immutable after create) ·
 * 系統自動 (system-assigned) · 進階 (advanced). Keep these four meanings
 * stable — do not invent new field-badge colours.
 */
const KINDS = {
  required: {
    label: '必填',
    fg: 'var(--warning)',
    bg: 'color-mix(in srgb, var(--warning) 16%, transparent)',
    bd: 'color-mix(in srgb, var(--warning) 40%, transparent)'
  },
  locked: {
    label: '建立後不可改',
    fg: 'var(--muted-foreground)',
    bg: 'color-mix(in oklch, var(--muted) 60%, transparent)',
    bd: 'color-mix(in oklch, var(--border) 80%, transparent)'
  },
  auto: {
    label: '系統自動',
    fg: 'var(--color-meeting)',
    bg: 'color-mix(in srgb, var(--color-meeting) 15%, transparent)',
    bd: 'color-mix(in srgb, var(--color-meeting) 38%, transparent)'
  },
  advanced: {
    label: '進階',
    fg: 'var(--primary)',
    bg: 'transparent',
    bd: 'color-mix(in srgb, var(--primary) 45%, transparent)'
  }
};
function FieldBadge({
  kind = 'required',
  children,
  className = '',
  style = {},
  ...props
}) {
  const k = KINDS[kind] || KINDS.required;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 'var(--radius-sm)',
      padding: '1px 6px',
      border: `1px solid ${k.bd}`,
      background: k.bg,
      color: k.fg,
      fontFamily: 'var(--font-sans)',
      fontSize: '10px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      ...style
    }
  }, props), children ?? k.label);
}
Object.assign(__ds_scope, { FieldBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FieldBadge.jsx", error: String((e && e.message) || e) }); }

// components/forms/FormField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — FormField
 * Label + control wrapper. The label uses the NEXORA wide-tracked uppercase
 * eyebrow treatment. Pass `hint` for help text and `error` for the warning
 * (orange) message.
 */
function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className = '',
  style = {},
  children,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: className,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, props), label && /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      fontSize: '11px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--muted-foreground)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--warning)',
      marginLeft: 4
    }
  }, "*")), children, error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--warning)'
    }
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      color: 'var(--muted-foreground)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { FormField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FormField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — Input
 * Text field. Transparent fill over a subtle input bg, gold focus ring.
 * Set `invalid` for the warning/destructive state.
 */
function Input({
  invalid = false,
  className = '',
  style = {},
  ...props
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("input", _extends({
    className: className,
    onFocus: e => {
      setFocus(true);
      props.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      props.onBlur?.(e);
    },
    style: {
      height: 'var(--control-h)',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${invalid ? 'var(--destructive)' : focus ? 'var(--ring)' : 'var(--border)'}`,
      background: 'color-mix(in oklch, var(--input) 60%, transparent)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
      padding: '0 12px',
      outline: 'none',
      boxShadow: focus ? '0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent)' : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      ...style
    }
  }, props));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NEXORA GRID — Select
 * Styled native <select>. Gold focus ring; inherits dark color-scheme so the
 * native option panel stays dark.
 */
function Select({
  invalid = false,
  className = '',
  style = {},
  children,
  ...props
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    className: className,
    onFocus: e => {
      setFocus(true);
      props.onFocus?.(e);
    },
    onBlur: e => {
      setFocus(false);
      props.onBlur?.(e);
    },
    style: {
      height: 'var(--control-h)',
      width: '100%',
      boxSizing: 'border-box',
      appearance: 'none',
      WebkitAppearance: 'none',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${invalid ? 'var(--destructive)' : focus ? 'var(--ring)' : 'var(--border)'}`,
      background: 'color-mix(in oklch, var(--input) 60%, transparent)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
      padding: '0 32px 0 12px',
      outline: 'none',
      cursor: 'pointer',
      boxShadow: focus ? '0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent)' : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      ...style
    }
  }, props), children), /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 9l6 6 6-6",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/App.jsx
try { (() => {
// NEXORA GRID UI kit — App shell (login → dashboard, module routing)
function NXApp() {
  const NXIcon = window.NXIcon;
  const [authed, setAuthed] = React.useState(false);
  const [active, setActive] = React.useState('home');
  if (!authed) return /*#__PURE__*/React.createElement(window.NXLoginScreen, {
    onLogin: () => setAuthed(true)
  });
  let screen;
  if (active === 'home') screen = /*#__PURE__*/React.createElement(window.NXHomeScreen, null);else if (active === 'parts') screen = /*#__PURE__*/React.createElement(window.NXMasterScreen, null);else if (active === 'sales') screen = /*#__PURE__*/React.createElement(window.NXDocumentScreen, null);else {
    const labels = {
      purchase: '進貨',
      inventory: '庫存',
      finance: '財務'
    };
    screen = /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        placeItems: 'center',
        minHeight: 360
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        color: 'var(--muted-foreground)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 56,
        height: 56,
        margin: '0 auto 14px',
        borderRadius: 16,
        display: 'grid',
        placeItems: 'center',
        background: 'color-mix(in oklch, var(--secondary) 50%, transparent)',
        color: 'var(--primary)'
      }
    }, /*#__PURE__*/React.createElement(NXIcon, {
      name: active === 'purchase' ? 'cart' : active === 'inventory' ? 'package' : 'wallet',
      size: 26
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--foreground)'
      }
    }, labels[active], "\u6A21\u7D44"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        marginTop: 6,
        maxWidth: 320
      }
    }, "\u6B64\u6A21\u7D44\u65BC\u672C UI Kit \u4E2D\u672A\u91CD\u5EFA\u3002\u8ACB\u898B\u300C\u9996\u9801\u300D\u300C\u6838\u5FC3\u4E3B\u6A94\u300D\u300C\u92B7\u8CA8\u300D\u4E09\u500B\u793A\u7BC4\u756B\u9762\u3002")));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement(window.NXTopBar, {
    onLogout: () => {
      setAuthed(false);
      setActive('home');
    },
    onNav: setActive,
    active: active
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--shell-max-w)',
      margin: '0 auto',
      padding: '20px 16px 48px'
    }
  }, screen));
}
window.NXApp = NXApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/DocumentScreen.jsx
try { (() => {
// NEXORA GRID UI kit — 銷貨單 (document workflow: list ⇄ detail, Alt+1/2 范式)
function NXDocumentScreen() {
  const {
    ToolbarButton,
    DocStatusBadge,
    Input
  } = window.NEXORAGRIDDesignSystem_6998e4;
  const NXIcon = window.NXIcon;
  const D = window.NX_DATA;
  const [view, setView] = React.useState('list');
  const [sel, setSel] = React.useState(D.salesOrders[0]);
  const total = D.orderItems.reduce((s, r) => s + r.amount, 0);
  const th = {
    padding: '10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--muted-foreground)'
  };
  const td = {
    padding: '9px 10px',
    fontSize: 13,
    borderBottom: '1px solid color-mix(in oklch, var(--border) 30%, transparent)'
  };
  const tab = (k, label, hot) => {
    const on = view === k;
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => setView(k),
      style: {
        flex: 1,
        padding: '9px 12px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: on ? 'var(--card)' : 'transparent',
        color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: on ? 'var(--shadow-sm)' : 'none'
      }
    }, label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        opacity: 0.7
      }
    }, hot));
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      letterSpacing: 'var(--tracking-widest)',
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase'
    }
  }, "\u92B7\u8CA8"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '2px 0 0',
      fontSize: 24,
      fontWeight: 600
    }
  }, "\u92B7\u8CA8\u55AE")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      padding: 4,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid color-mix(in oklch, var(--border) 50%, transparent)',
      background: 'color-mix(in oklch, var(--muted) 25%, transparent)'
    }
  }, tab('list', '資料瀏覽（列表）', 'Alt+1'), tab('detail', '詳細資料（明細）', 'Alt+2')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
      borderBottom: '1px solid color-mix(in oklch, var(--border) 40%, transparent)',
      paddingBottom: 10
    }
  }, /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "A",
    label: "\u65B0\u589E",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "plus",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "E",
    label: "\u66F4\u6B63",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "pencil",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "S",
    label: "\u5B58\u6A94",
    accent: true,
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "save",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "D",
    label: "\u4F5C\u5EE2",
    variant: "danger",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "power",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    label: "\u5217\u5370",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "download",
      size: 13
    })
  })), view === 'list' ? /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'color-mix(in oklch, var(--background) 55%, transparent)',
      borderBottom: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u55AE\u865F"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u5BA2\u6236"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u65E5\u671F"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u91D1\u984D"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u72C0\u614B"))), /*#__PURE__*/React.createElement("tbody", null, D.salesOrders.map((o, i) => {
    const on = sel.id === o.id;
    return /*#__PURE__*/React.createElement("tr", {
      key: o.id,
      onClick: () => {
        setSel(o);
      },
      onDoubleClick: () => setView('detail'),
      style: {
        cursor: 'pointer',
        background: on ? 'linear-gradient(90deg, rgba(232,160,32,0.16), rgba(232,160,32,0.06))' : i % 2 ? 'color-mix(in oklch, var(--foreground) 3%, transparent)' : 'transparent',
        boxShadow: on ? 'inset 3px 0 0 0 var(--nx-amber)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        fontFamily: 'var(--font-mono)',
        fontSize: 12
      }
    }, o.id), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        fontWeight: 500
      }
    }, o.partner), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--muted-foreground)'
      }
    }, o.date), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, o.amount), /*#__PURE__*/React.createElement("td", {
      style: td
    }, /*#__PURE__*/React.createElement(DocStatusBadge, {
      status: o.status,
      label: o.statusLabel
    })));
  })))) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))',
      gap: 12,
      padding: 16,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      background: 'color-mix(in oklch, var(--card) 70%, transparent)'
    }
  }, [['單號', sel.id], ['客戶', sel.partner], ['單據日期', sel.date], ['狀態', null]].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--muted-foreground)',
      marginBottom: 4
    }
  }, k), v ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      fontFamily: k === '單號' || k === '單據日期' ? 'var(--font-mono)' : 'inherit'
    }
  }, v) : /*#__PURE__*/React.createElement(DocStatusBadge, {
    status: sel.status,
    label: sel.statusLabel
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 12px',
      borderBottom: '1px solid color-mix(in oklch, var(--border) 40%, transparent)',
      background: 'color-mix(in oklch, var(--muted) 20%, transparent)',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "A",
    label: "\u65B0\u589E\u660E\u7D30",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "plus",
      size: 13
    })
  })), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'color-mix(in oklch, var(--background) 55%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      width: 48
    }
  }, "#"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u54C1\u9805"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u6578\u91CF"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u55AE\u50F9"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u91D1\u984D"))), /*#__PURE__*/React.createElement("tbody", null, D.orderItems.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    style: {
      background: i % 2 ? 'color-mix(in oklch, var(--foreground) 3%, transparent)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      color: 'var(--muted-foreground)'
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 500
    }
  }, r.part), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.qty.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, r.price), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 600
    }
  }, "NT$ ", r.amount.toLocaleString())))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 4,
    style: {
      ...td,
      textAlign: 'right',
      fontWeight: 600,
      borderBottom: 'none'
    }
  }, "\u5408\u8A08"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 700,
      color: 'var(--primary)',
      fontSize: 15,
      borderBottom: 'none'
    }
  }, "NT$ ", total.toLocaleString())))))));
}
window.NXDocumentScreen = NXDocumentScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/DocumentScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// NEXORA GRID UI kit — Home dashboard (greeting + KPI metrics + workflow + tasks)
function NXHomeScreen() {
  const {
    StatCard,
    Card,
    Badge
  } = window.NEXORAGRIDDesignSystem_6998e4;
  const NXIcon = window.NXIcon;
  const D = window.NX_DATA;
  const [tasks, setTasks] = React.useState(D.tasks);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';
  const pending = tasks.filter(t => !t.done).length;
  const sectionHead = (icon, title, meta) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: icon,
    size: 16,
    style: {
      color: 'var(--primary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, title), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, meta));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 28,
      fontWeight: 600
    }
  }, greeting, "\uFF0C", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)'
    }
  }, D.user.name)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--muted-foreground)',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "alertCircle",
    size: 16,
    style: {
      color: 'var(--primary)'
    }
  }), "\u4ECA\u5929\u9084\u6709 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)',
      fontWeight: 600
    }
  }, pending, " \u7B46"), " \u5F85\u8FA6\u4E8B\u9805\u3002")), /*#__PURE__*/React.createElement("section", null, sectionHead('home', '儀表數據', `${D.metrics.length} / 5 已設定`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 12
    }
  }, D.metrics.map((m, i) => /*#__PURE__*/React.createElement(StatCard, _extends({
    key: i
  }, m))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 16
    },
    className: "nx-home-cols"
  }, /*#__PURE__*/React.createElement(Card, {
    glass: true
  }, sectionHead('fileText', '單據流程', '報價 → 銷貨 → 出貨 → 收款'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 0
    }
  }, D.flow.map((step, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: step
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 15,
      background: i < 2 ? 'var(--primary)' : 'color-mix(in oklch, var(--secondary) 70%, transparent)',
      color: i < 2 ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
      boxShadow: i < 2 ? 'var(--nx-glow-primary)' : 'none'
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: i < 2 ? 'var(--foreground)' : 'var(--muted-foreground)'
    }
  }, step)), i < D.flow.length - 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 0.6,
      height: 2,
      background: i < 1 ? 'var(--primary)' : 'color-mix(in oklch, var(--border) 70%, transparent)',
      marginBottom: 22
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)',
      marginBottom: 6,
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u76EE\u6A19\u9054\u6210 \xB7 \u672C\u6708\u92B7\u8CA8"), /*#__PURE__*/React.createElement("span", null, "82%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      borderRadius: 999,
      background: 'var(--muted)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: '82%',
      borderRadius: 999,
      background: 'var(--nx-goal-gradient)'
    }
  })))), /*#__PURE__*/React.createElement(Card, {
    glass: true
  }, sectionHead('checkSquare', '待辦任務', `${pending} 筆待處理`), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, tasks.map(t => /*#__PURE__*/React.createElement("label", {
    key: t.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px',
      borderRadius: 'var(--radius-md)',
      background: 'color-mix(in oklch, var(--secondary) 30%, transparent)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: t.done,
    onChange: () => setTasks(ts => ts.map(x => x.id === t.id ? {
      ...x,
      done: !x.done
    } : x)),
    style: {
      width: 16,
      height: 16,
      accentColor: 'var(--primary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      color: t.done ? 'var(--muted-foreground)' : 'var(--foreground)',
      textDecoration: t.done ? 'line-through' : 'none'
    }
  }, t.text), /*#__PURE__*/React.createElement(Badge, {
    variant: "outline"
  }, t.tag)))))));
}
window.NXHomeScreen = NXHomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/Icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// NEXORA GRID UI kit — lucide icon subset (paths copied from lucide-react, the
// codebase's icon system). Renders 24×24 stroke icons via currentColor.
const NX_ICON_PATHS = {
  search: ['<circle cx="11" cy="11" r="8"/>', '<path d="m21 21-4.3-4.3"/>'],
  plus: ['<path d="M5 12h14"/>', '<path d="M12 5v14"/>'],
  pencil: ['<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>', '<path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>'],
  save: ['<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>', '<path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>', '<path d="M7 3v4a1 1 0 0 0 1 1h7"/>'],
  power: ['<path d="M18.36 6.64A9 9 0 1 1 5.64 6.64"/>', '<path d="M12 2v10"/>'],
  refresh: ['<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>', '<path d="M21 3v5h-5"/>', '<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>', '<path d="M3 21v-5h5"/>'],
  download: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<path d="M7 10l5 5 5-5"/>', '<path d="M12 15V3"/>'],
  chevronDown: ['<path d="m6 9 6 6 6-6"/>'],
  chevronLeft: ['<path d="m15 18-6-6 6-6"/>'],
  chevronRight: ['<path d="m9 18 6-6-6-6"/>'],
  chevronsLeft: ['<path d="m11 17-5-5 5-5"/>', '<path d="m18 17-5-5 5-5"/>'],
  chevronsRight: ['<path d="m6 17 5-5-5-5"/>', '<path d="m13 17 5-5-5-5"/>'],
  bell: ['<path d="M10.268 21a2 2 0 0 0 3.464 0"/>', '<path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>'],
  megaphone: ['<path d="m3 11 18-5v12L3 14v-3z"/>', '<path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>'],
  sun: ['<circle cx="12" cy="12" r="4"/>', '<path d="M12 2v2"/>', '<path d="M12 20v2"/>', '<path d="m4.93 4.93 1.41 1.41"/>', '<path d="m17.66 17.66 1.41 1.41"/>', '<path d="M2 12h2"/>', '<path d="M20 12h2"/>', '<path d="m6.34 17.66-1.41 1.41"/>', '<path d="m19.07 4.93-1.41 1.41"/>'],
  moon: ['<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"/>'],
  user: ['<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>', '<circle cx="12" cy="7" r="4"/>'],
  building: ['<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>', '<path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>', '<path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>', '<path d="M10 6h4"/>', '<path d="M10 10h4"/>', '<path d="M10 14h4"/>', '<path d="M10 18h4"/>'],
  lock: ['<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>', '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'],
  arrowRight: ['<path d="M5 12h14"/>', '<path d="m12 5 7 7-7 7"/>'],
  filter: ['<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'],
  arrowUpDown: ['<path d="m21 16-4 4-4-4"/>', '<path d="M17 20V4"/>', '<path d="m3 8 4-4 4 4"/>', '<path d="M7 4v16"/>'],
  checkSquare: ['<path d="m9 11 3 3L22 4"/>', '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'],
  home: ['<rect width="7" height="9" x="3" y="3" rx="1"/>', '<rect width="7" height="5" x="14" y="3" rx="1"/>', '<rect width="7" height="9" x="14" y="12" rx="1"/>', '<rect width="7" height="5" x="3" y="16" rx="1"/>'],
  boxes: ['<path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/>', '<path d="m7 16.5-4.74-2.85"/>', '<path d="m7 16.5 5-3"/>', '<path d="M7 16.5v5.17"/>', '<path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 8.5l-5 3Z"/>', '<path d="m17 16.5-5-3"/>', '<path d="m17 16.5 4.74-2.85"/>', '<path d="M17 16.5v5.17"/>', '<path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/>', '<path d="M12 8 7.26 5.15"/>', '<path d="m12 8 4.74-2.85"/>', '<path d="M12 13.5V8"/>'],
  cart: ['<circle cx="8" cy="21" r="1"/>', '<circle cx="19" cy="21" r="1"/>', '<path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'],
  package: ['<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>', '<path d="M12 22V12"/>', '<path d="m3.3 7 8.7 5 8.7-5"/>', '<path d="m7.5 4.27 9 5.15"/>'],
  wallet: ['<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5"/>', '<path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>'],
  fileText: ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>', '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>', '<path d="M16 13H8"/>', '<path d="M16 17H8"/>', '<path d="M10 9H8"/>'],
  alertCircle: ['<circle cx="12" cy="12" r="10"/>', '<path d="M12 8v4"/>', '<path d="M12 16h.01"/>'],
  eye: ['<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>', '<circle cx="12" cy="12" r="3"/>'],
  send: ['<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>', '<path d="m21.854 2.147-10.94 10.939"/>'],
  check: ['<path d="M20 6 9 17l-5-5"/>'],
  checkCircle: ['<path d="M21.801 10A10 10 0 1 1 17 3.335"/>', '<path d="m9 11 3 3L22 4"/>'],
  clock: ['<circle cx="12" cy="12" r="10"/>', '<path d="M12 6v6l4 2"/>'],
  undo: ['<path d="M3 7v6h6"/>', '<path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>'],
  truck: ['<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>', '<path d="M15 18H9"/>', '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>', '<circle cx="17" cy="18" r="2"/>', '<circle cx="7" cy="18" r="2"/>'],
  packageCheck: ['<path d="m16 16 2 2 4-4"/>', '<path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>', '<path d="m3.3 7 8.7 5 8.7-5"/>', '<path d="M12 22V12"/>'],
  fileCheck: ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>', '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>', '<path d="m9 15 2 2 4-4"/>'],
  x: ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>'],
  mapPin: ['<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>', '<circle cx="12" cy="10" r="3"/>'],
  calendar: ['<path d="M8 2v4"/>', '<path d="M16 2v4"/>', '<rect width="18" height="18" x="3" y="4" rx="2"/>', '<path d="M3 10h18"/>'],
  hash: ['<line x1="4" x2="20" y1="9" y2="9"/>', '<line x1="4" x2="20" y1="15" y2="15"/>', '<line x1="10" x2="8" y1="3" y2="21"/>', '<line x1="16" x2="14" y1="3" y2="21"/>'],
  factory: ['<path d="M12 16h.01"/>', '<path d="M16 16h.01"/>', '<path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 11.5v-2a.5.5 0 0 0-.769-.422L9.77 11.922A.5.5 0 0 1 9 11.5V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/>', '<path d="M8 16h.01"/>'],
  user2: ['<circle cx="12" cy="8" r="5"/>', '<path d="M20 21a8 8 0 0 0-16 0"/>'],
  printer: ['<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>', '<path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/>', '<rect width="12" height="8" x="6" y="14" rx="1"/>'],
  filter: ['<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'],
  banknote: ['<rect width="20" height="12" x="2" y="6" rx="2"/>', '<circle cx="12" cy="12" r="2"/>', '<path d="M6 12h.01M18 12h.01"/>']
};
function NXIcon({
  name,
  size = 16,
  strokeWidth = 2,
  style = {},
  ...props
}) {
  const paths = NX_ICON_PATHS[name];
  if (!paths) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: paths.join('')
    }
  }, props));
}
window.NXIcon = NXIcon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/LoginScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// NEXORA GRID UI kit — Login (company / employee / password over reactor sky)
function NXLoginScreen({
  onLogin
}) {
  const NXIcon = window.NXIcon;
  const [show, setShow] = React.useState(false);
  const [f, setF] = React.useState({
    co: '亞羅汽材行',
    emp: '',
    pw: ''
  });
  const [busy, setBusy] = React.useState(false);
  const submit = e => {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onLogin();
    }, 700);
  };
  const field = (icon, props) => /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("input", _extends({}, props, {
    style: {
      width: '100%',
      height: 48,
      boxSizing: 'border-box',
      background: 'color-mix(in oklch, var(--secondary) 50%, transparent)',
      border: '1px solid color-mix(in oklch, var(--border) 60%, transparent)',
      borderRadius: 'var(--radius-lg)',
      padding: '0 44px',
      color: 'var(--foreground)',
      fontSize: 14,
      outline: 'none',
      fontFamily: 'var(--font-sans)'
    }
  })));
  const label = {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    color: 'var(--muted-foreground)',
    marginBottom: 8
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 130% 80% at 50% -12%, rgba(255,210,130,0.12), transparent 52%), var(--background)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 400
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-icon-512.png",
    alt: "",
    style: {
      width: 84,
      height: 84,
      borderRadius: 20,
      boxShadow: 'var(--nx-glow-primary)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      whiteSpace: 'nowrap'
    }
  }, "NEXORA ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)'
    }
  }, "GRID")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 11,
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
      color: 'var(--muted-foreground)',
      position: 'relative',
      zIndex: 1
    }
  }, "\u4F01\u696D\u8CC7\u6E90\u898F\u5283\u4E3B\u63A7\u53F0")), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "nx-glass nx-glass-raised",
    style: {
      padding: 28,
      borderRadius: 'var(--radius-2xl)',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: label
  }, "\u516C\u53F8\u5E33\u865F"), field('building', {
    value: f.co,
    onChange: e => setF({
      ...f,
      co: e.target.value
    }),
    placeholder: 'Company ID'
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: label
  }, "\u54E1\u5DE5\u7DE8\u865F"), field('user', {
    value: f.emp,
    onChange: e => setF({
      ...f,
      emp: e.target.value
    }),
    placeholder: 'Employee ID'
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: label
  }, "\u4F7F\u7528\u8005\u5BC6\u78BC"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 14,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "lock",
    size: 16
  })), /*#__PURE__*/React.createElement("input", {
    type: show ? 'text' : 'password',
    value: f.pw,
    onChange: e => setF({
      ...f,
      pw: e.target.value
    }),
    placeholder: "Password",
    style: {
      width: '100%',
      height: 48,
      boxSizing: 'border-box',
      background: 'color-mix(in oklch, var(--secondary) 50%, transparent)',
      border: '1px solid color-mix(in oklch, var(--border) 60%, transparent)',
      borderRadius: 'var(--radius-lg)',
      padding: '0 44px',
      color: 'var(--foreground)',
      fontSize: 14,
      outline: 'none',
      fontFamily: 'var(--font-sans)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShow(s => !s),
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: 'var(--muted-foreground)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "eye",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      background: 'none',
      border: 'none',
      fontSize: 12,
      color: 'var(--muted-foreground)',
      cursor: 'pointer'
    }
  }, "\u5FD8\u8A18\u5BC6\u78BC\uFF1F")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: busy,
    style: {
      height: 48,
      borderRadius: 'var(--radius-lg)',
      border: 'none',
      background: 'var(--foreground)',
      color: 'var(--background)',
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      cursor: busy ? 'wait' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8
    }
  }, busy ? '登入中…' : /*#__PURE__*/React.createElement(React.Fragment, null, "\u767B\u5165\u7CFB\u7D71 ", /*#__PURE__*/React.createElement(NXIcon, {
    name: "arrowRight",
    size: 16
  }))))));
}
window.NXLoginScreen = NXLoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/LoginScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/MasterScreen.jsx
try { (() => {
// NEXORA GRID UI kit — 核心主檔 / 零件主檔 (dense master table + ERP toolbar)
function NXMasterScreen() {
  const {
    ToolbarButton,
    DocStatusBadge,
    Input,
    Badge
  } = window.NEXORAGRIDDesignSystem_6998e4;
  const NXIcon = window.NXIcon;
  const D = window.NX_DATA;
  const [sel, setSel] = React.useState(D.parts[0].code);
  const [q, setQ] = React.useState('');
  const [showInactive, setShowInactive] = React.useState(true);
  const rows = D.parts.filter(p => (showInactive || p.active) && (q === '' || p.name.includes(q) || p.code.toLowerCase().includes(q.toLowerCase()) || p.brand.toLowerCase().includes(q.toLowerCase())));
  const th = {
    padding: '10px 10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--muted-foreground)',
    whiteSpace: 'nowrap'
  };
  const td = {
    padding: '9px 10px',
    fontSize: 13,
    borderBottom: '1px solid color-mix(in oklch, var(--border) 30%, transparent)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      letterSpacing: 'var(--tracking-widest)',
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase'
    }
  }, "\u6838\u5FC3\u4E3B\u6A94"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '2px 0 0',
      fontSize: 24,
      fontWeight: 600
    }
  }, "\u96F6\u4EF6\u4E3B\u6A94")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
      padding: 8,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      background: 'color-mix(in oklch, var(--card) 80%, transparent)',
      boxShadow: 'var(--highlight-top)'
    }
  }, /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "A",
    label: "\u65B0\u589E",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "plus",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "E",
    label: "\u66F4\u6B63",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "pencil",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "F",
    label: "\u67E5\u8A62",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "search",
      size: 13
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 20,
      background: 'var(--border)',
      margin: '0 2px'
    }
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "D",
    label: "\u505C\u7528",
    variant: "danger",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "power",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    label: "\u532F\u51FA",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "download",
      size: 13
    })
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    label: "\u91CD\u65B0\u6574\u7406",
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "refresh",
      size: 13
    })
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(ToolbarButton, {
    label: "\u986F\u793A\u505C\u7528",
    pressed: showInactive,
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "eye",
      size: 13
    }),
    onClick: () => setShowInactive(s => !s)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 200
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u641C\u5C0B\u54C1\u540D / \u7DE8\u865F / \u54C1\u724C\u2026",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      height: 32,
      fontSize: 12
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "alertCircle",
    size: 14,
    style: {
      color: 'var(--warning)'
    }
  }), "\u76EE\u524D\u89D2\u8272\uFF1A", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--foreground)',
      fontWeight: 500
    }
  }, "\u92B7\u552E\u4E3B\u7BA1"), " \u2014 \u53EF\u898B\u552E\u50F9\uFF0C\u9032\u8CA8\u6210\u672C\u6B04\u4F4D\u5DF2\u4F9D\u6B0A\u9650\u96B1\u85CF\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'color-mix(in oklch, var(--card) 40%, var(--background))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nx-scroll",
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      minWidth: 760,
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'color-mix(in oklch, var(--background) 55%, transparent)',
      borderBottom: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      width: 56
    }
  }, "\u5E8F\u865F"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u96F6\u4EF6\u7DE8\u865F"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u54C1\u540D"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u54C1\u724C"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u5206\u985E"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u5EAB\u5B58"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u552E\u50F9"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u72C0\u614B"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((p, i) => {
    const on = sel === p.code;
    return /*#__PURE__*/React.createElement("tr", {
      key: p.code,
      onClick: () => setSel(p.code),
      style: {
        cursor: 'pointer',
        background: on ? 'linear-gradient(90deg, rgba(232,160,32,0.16), rgba(232,160,32,0.06))' : i % 2 ? 'color-mix(in oklch, var(--foreground) 3%, transparent)' : 'transparent',
        boxShadow: on ? 'inset 3px 0 0 0 var(--nx-amber)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--muted-foreground)'
      }
    }, String(i + 1).padStart(4, '0')), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--muted-foreground)'
      }
    }, p.code), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        fontWeight: 500
      }
    }, p.name), /*#__PURE__*/React.createElement("td", {
      style: td
    }, p.brand), /*#__PURE__*/React.createElement("td", {
      style: td
    }, /*#__PURE__*/React.createElement(Badge, {
      variant: "outline"
    }, p.group)), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        color: p.stock === 0 ? 'var(--color-danger)' : p.stock < 50 ? 'var(--warning)' : 'var(--foreground)'
      }
    }, p.stock.toLocaleString()), /*#__PURE__*/React.createElement("td", {
      style: {
        ...td,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, p.price), /*#__PURE__*/React.createElement("td", {
      style: td
    }, /*#__PURE__*/React.createElement(DocStatusBadge, {
      status: p.status,
      label: p.statusLabel
    })));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      borderTop: '1px solid var(--border)',
      fontSize: 11,
      color: 'var(--muted-foreground)',
      background: 'color-mix(in oklch, var(--background) 50%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u5171 ", D.parts.length, " \u7B46 \xB7 \u986F\u793A ", rows.length, " \u7B46"), /*#__PURE__*/React.createElement("span", null, "\u6BCF\u9801 20 \u7B46"))));
}
window.NXMasterScreen = NXMasterScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/MasterScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/TopBar.jsx
try { (() => {
// NEXORA GRID UI kit — TopBar (sticky chrome: logo, plan, tenant, clock, theme, user)
function NXTopBar({
  onLogout,
  onNav,
  active
}) {
  const {
    PlanBadge
  } = window.NEXORAGRIDDesignSystem_6998e4;
  const NXIcon = window.NXIcon;
  const D = window.NX_DATA;
  const [now, setNow] = React.useState(new Date());
  const [light, setLight] = React.useState(false);
  const [menu, setMenu] = React.useState(null); // 'bell' | 'user' | null

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  React.useEffect(() => {
    document.documentElement.classList.toggle('light', light);
  }, [light]);
  const dateStr = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const timeStr = now.toLocaleTimeString('zh-TW', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const unread = D.bulletins.filter(b => b.unread).length;
  const navItems = [{
    key: 'home',
    label: '首頁',
    icon: 'home'
  }, {
    key: 'parts',
    label: '核心主檔',
    icon: 'boxes'
  }, {
    key: 'purchase',
    label: '進貨',
    icon: 'cart'
  }, {
    key: 'inventory',
    label: '庫存',
    icon: 'package'
  }, {
    key: 'sales',
    label: '銷貨',
    icon: 'fileText'
  }, {
    key: 'finance',
    label: '財務',
    icon: 'wallet'
  }];
  const iconBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 36,
    borderRadius: 'var(--radius-lg)',
    border: 'none',
    background: 'transparent',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    position: 'relative'
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid color-mix(in oklch, var(--border) 60%, transparent)',
      background: 'color-mix(in oklch, var(--card) 80%, transparent)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--shell-max-w)',
      margin: '0 auto',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-icon-192.png",
    alt: "",
    style: {
      width: 30,
      height: 30,
      borderRadius: 8
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: '-0.01em',
      whiteSpace: 'nowrap'
    }
  }, "NEXORA ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--primary)'
    }
  }, "GRID")), /*#__PURE__*/React.createElement(PlanBadge, {
    plan: D.plan
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, D.tenant)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 1.3,
      color: 'var(--muted-foreground)'
    },
    className: "nx-clock"
  }, /*#__PURE__*/React.createElement("div", null, dateStr), /*#__PURE__*/React.createElement("div", {
    style: {
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--foreground)'
    }
  }, timeStr)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: iconBtn,
    onClick: () => setMenu(menu === 'bell' ? null : 'bell'),
    "aria-label": "\u516C\u544A"
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "megaphone",
    size: 18
  }), unread > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 4,
      right: 4,
      height: 15,
      minWidth: 15,
      padding: '0 3px',
      borderRadius: 999,
      background: 'var(--color-danger)',
      color: '#fff',
      fontSize: 9,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, unread)), menu === 'bell' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 0,
      marginTop: 6,
      width: 300,
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border)',
      background: 'var(--popover)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      fontSize: 12,
      fontWeight: 600,
      borderBottom: '1px solid color-mix(in oklch, var(--border) 50%, transparent)'
    }
  }, "\u516C\u544A \xB7 \u672A\u8B80 ", unread), D.bulletins.map(b => /*#__PURE__*/React.createElement("div", {
    key: b.id,
    style: {
      padding: '10px 12px',
      borderBottom: '1px solid color-mix(in oklch, var(--border) 30%, transparent)',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      padding: '1px 5px',
      borderRadius: 4,
      background: 'var(--secondary)',
      color: 'var(--muted-foreground)'
    }
  }, b.type), b.unread && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: 999,
      background: 'var(--color-danger)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)',
      fontSize: 10
    }
  }, b.date)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      color: 'var(--foreground)'
    }
  }, b.title))))), /*#__PURE__*/React.createElement("button", {
    style: iconBtn,
    onClick: () => setLight(l => !l),
    "aria-label": "\u5207\u63DB\u6DF1\u6DFA"
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: light ? 'moon' : 'sun',
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenu(menu === 'user' ? null : 'user'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 8px',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid color-mix(in oklch, var(--border) 60%, transparent)',
      background: 'transparent',
      color: 'var(--foreground)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      height: 30,
      width: 30,
      borderRadius: 999,
      background: 'color-mix(in srgb, var(--primary) 22%, transparent)',
      color: 'var(--primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 600
    }
  }, D.user.initial), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'left',
      lineHeight: 1.2
    },
    className: "nx-user-name"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 12,
      fontWeight: 500
    }
  }, D.user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 10,
      color: 'var(--muted-foreground)'
    }
  }, D.user.role)), /*#__PURE__*/React.createElement(NXIcon, {
    name: "chevronDown",
    size: 14,
    style: {
      color: 'var(--muted-foreground)'
    }
  })), menu === 'user' && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 0,
      marginTop: 6,
      width: 180,
      borderRadius: 'var(--radius-xl)',
      border: '1px solid var(--border)',
      background: 'var(--popover)',
      boxShadow: 'var(--shadow-lg)',
      padding: 4
    }
  }, ['個人設定', '系統設定'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '8px 10px',
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      color: 'var(--foreground)',
      fontSize: 12,
      cursor: 'pointer'
    }
  }, t)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'color-mix(in oklch, var(--border) 50%, transparent)',
      margin: '4px 0'
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      padding: '8px 10px',
      borderRadius: 8,
      border: 'none',
      background: 'transparent',
      color: 'var(--color-danger)',
      fontSize: 12,
      cursor: 'pointer'
    }
  }, "\u767B\u51FA\u7CFB\u7D71"))))), /*#__PURE__*/React.createElement("nav", {
    style: {
      maxWidth: 'var(--shell-max-w)',
      margin: '0 auto',
      padding: '0 12px',
      display: 'flex',
      gap: 2,
      overflowX: 'auto'
    },
    className: "nx-scroll"
  }, navItems.map(it => {
    const on = active === it.key;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onNav(it.key),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '9px 14px',
        border: 'none',
        borderBottom: `2px solid ${on ? 'var(--primary)' : 'transparent'}`,
        background: 'transparent',
        color: on ? 'var(--foreground)' : 'var(--muted-foreground)',
        fontSize: 13,
        fontWeight: on ? 600 : 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement(NXIcon, {
      name: it.icon,
      size: 16,
      style: {
        color: on ? 'var(--primary)' : 'var(--muted-foreground)'
      }
    }), it.label);
  })));
}
window.NXTopBar = NXTopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/TopBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp/data.js
try { (() => {
// NEXORA GRID — UI kit mock data (Taiwan auto-parts distributor)
window.NX_DATA = {
  tenant: '亞羅汽材行',
  user: {
    name: '陳柏宏',
    role: '銷售主管',
    initial: '陳'
  },
  plan: 'PRO',
  metrics: [{
    category: '銷貨',
    label: '本月銷貨額',
    value: '4,820,000',
    unit: 'NT$',
    delta: '12%',
    deltaDir: 'up'
  }, {
    category: '進貨',
    label: '待收貨單據',
    value: '42',
    unit: '筆',
    delta: '6%',
    deltaDir: 'up'
  }, {
    category: '庫存',
    label: '低水位品項',
    value: '18',
    unit: '項',
    delta: '3%',
    deltaDir: 'down'
  }, {
    category: '財務',
    label: '本月應收',
    value: '1,236,500',
    unit: 'NT$',
    delta: '8%',
    deltaDir: 'up'
  }, {
    category: '報表',
    label: '毛利率',
    value: '23.8',
    unit: '%',
    delta: '1.2%',
    deltaDir: 'up'
  }],
  // 報價 → 銷貨 → 出貨 → 收款
  flow: ['報價', '銷貨', '出貨', '收款'],
  tasks: [{
    id: 1,
    text: '核對 SO-2026-0118 出貨數量',
    tag: '出貨',
    done: false
  }, {
    id: 2,
    text: '亞東貿易報價單回覆',
    tag: '報價',
    done: false
  }, {
    id: 3,
    text: '月底盤點 — 台中倉 A 區',
    tag: '庫存',
    done: true
  }, {
    id: 4,
    text: '確認三和機械應收款',
    tag: '收款',
    done: false
  }],
  bulletins: [{
    id: 1,
    type: '緊急',
    title: '系統維護：本週六 02:00–04:00',
    date: '06/07',
    unread: true
  }, {
    id: 2,
    type: '公司',
    title: 'Q2 業績獎金辦法公告',
    date: '06/05',
    unread: true
  }, {
    id: 3,
    type: '系統',
    title: '新增「自動補貨」模組設定',
    date: '06/03',
    unread: false
  }],
  // 零件主檔（業務看得到售價、看不到進貨成本 — 權限分頁細控）
  parts: [{
    code: 'BRK-PAD-0042',
    name: '前煞車來令片',
    brand: 'NISSHINBO',
    group: '煞車系統',
    model: 'Altis 2014-2018',
    stock: 1240,
    price: 'NT$ 320',
    status: 'C',
    statusLabel: '啟用',
    active: true
  }, {
    code: 'OIL-FLT-0118',
    name: '機油濾芯',
    brand: 'DENSO',
    group: '濾清器',
    model: '通用',
    stock: 86,
    price: 'NT$ 110',
    status: 'C',
    statusLabel: '啟用',
    active: true
  }, {
    code: 'SPK-PLG-0205',
    name: '銥合金火星塞',
    brand: 'NGK',
    group: '點火系統',
    model: 'CRV 2017+',
    stock: 5008,
    price: 'NT$ 250',
    status: 'C',
    statusLabel: '啟用',
    active: true
  }, {
    code: 'BLT-TMG-0067',
    name: '正時皮帶組',
    brand: 'GATES',
    group: '傳動系統',
    model: 'Civic 2012-2016',
    stock: 12,
    price: 'NT$ 1,850',
    status: 'R',
    statusLabel: '低水位',
    active: true
  }, {
    code: 'BAT-12V-0301',
    name: '免保養電瓶 12V',
    brand: 'GS',
    group: '電系',
    model: '通用',
    stock: 0,
    price: 'NT$ 2,400',
    status: 'V',
    statusLabel: '停用',
    active: false
  }, {
    code: 'WPR-BLD-0024',
    name: '矽膠雨刷 24"',
    brand: 'BOSCH',
    group: '雨刷',
    model: '通用',
    stock: 430,
    price: 'NT$ 380',
    status: 'C',
    statusLabel: '啟用',
    active: true
  }, {
    code: 'AIR-FLT-0090',
    name: '空氣濾芯',
    brand: 'DENSO',
    group: '濾清器',
    model: 'Camry 2018+',
    stock: 268,
    price: 'NT$ 290',
    status: 'C',
    statusLabel: '啟用',
    active: true
  }, {
    code: 'SHK-ABS-0156',
    name: '前避震器',
    brand: 'KYB',
    group: '懸吊系統',
    model: 'Vios 2014+',
    stock: 54,
    price: 'NT$ 1,650',
    status: 'C',
    statusLabel: '啟用',
    active: true
  }],
  // 銷貨單明細
  salesOrders: [{
    id: 'SO-2026-0118',
    partner: '三和機械',
    date: '2026-06-08',
    amount: 'NT$ 372,000',
    status: 'S',
    statusLabel: '已送出'
  }, {
    id: 'SO-2026-0117',
    partner: '亞東貿易',
    date: '2026-06-07',
    amount: 'NT$ 84,600',
    status: 'C',
    statusLabel: '完成'
  }, {
    id: 'SO-2026-0116',
    partner: '永豐汽材',
    date: '2026-06-06',
    amount: 'NT$ 1,251,000',
    status: 'P',
    statusLabel: '已過帳'
  }, {
    id: 'SO-2026-0115',
    partner: '大同車業',
    date: '2026-06-05',
    amount: 'NT$ 46,200',
    status: 'D',
    statusLabel: '草稿'
  }, {
    id: 'SO-2026-0114',
    partner: '長榮零件',
    date: '2026-06-04',
    amount: 'NT$ 18,900',
    status: 'V',
    statusLabel: '作廢'
  }],
  orderItems: [{
    id: 'r1',
    part: '前煞車來令片',
    qty: 600,
    price: 320,
    amount: 192000
  }, {
    id: 'r2',
    part: '機油濾芯',
    qty: 400,
    price: 110,
    amount: 44000
  }, {
    id: 'r3',
    part: '銥合金火星塞',
    qty: 480,
    price: 250,
    amount: 120000
  }, {
    id: 'r4',
    part: '矽膠雨刷 24"',
    qty: 42,
    price: 380,
    amount: 15960
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/data.js", error: String((e && e.message) || e) }); }

// ui_kits/erp/fallback.jsx
try { (() => {
// NEXORA GRID UI kit — fallback component shims.
// Loaded AFTER _ds_bundle.js. If the compiled bundle is present (e.g. inside
// the Design System tab) this is a near no-op; when the kit is opened as a
// plain page where the generated bundle isn't served, these compact versions
// keep the showcase fully rendered. Visuals mirror components/*.
(function () {
  const NS = window.NEXORAGRIDDesignSystem_6998e4 = window.NEXORAGRIDDesignSystem_6998e4 || {};
  const def = (k, fn) => {
    if (!NS[k]) NS[k] = fn;
  };
  const h = React.createElement;
  def('Button', function ({
    variant = 'default',
    size = 'default',
    style = {},
    children,
    ...p
  }) {
    const sz = {
      sm: {
        height: 32,
        padding: '0 12px',
        fontSize: 12
      },
      default: {
        height: 36,
        padding: '0 16px',
        fontSize: 14
      },
      lg: {
        height: 40,
        padding: '0 24px',
        fontSize: 15
      },
      'icon-sm': {
        height: 32,
        width: 32,
        padding: 0
      },
      icon: {
        height: 36,
        width: 36,
        padding: 0
      }
    }[size] || {};
    const v = {
      default: {
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        border: '1px solid transparent'
      },
      secondary: {
        background: 'var(--secondary)',
        color: 'var(--secondary-foreground)',
        border: '1px solid transparent'
      },
      outline: {
        background: 'transparent',
        color: 'var(--foreground)',
        border: '1px solid var(--border)'
      },
      ghost: {
        background: 'transparent',
        color: 'var(--foreground)',
        border: '1px solid transparent'
      },
      destructive: {
        background: 'var(--destructive)',
        color: '#fff',
        border: '1px solid transparent'
      },
      link: {
        background: 'transparent',
        color: 'var(--primary)',
        border: '1px solid transparent',
        textDecoration: 'underline'
      }
    }[variant];
    return h('button', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        cursor: 'pointer',
        ...sz,
        ...v,
        ...style
      },
      ...p
    }, children);
  });
  def('Badge', function ({
    variant = 'default',
    style = {},
    children,
    ...p
  }) {
    const v = {
      default: {
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        border: '1px solid transparent'
      },
      secondary: {
        background: 'var(--secondary)',
        color: 'var(--secondary-foreground)',
        border: '1px solid transparent'
      },
      destructive: {
        background: 'var(--destructive)',
        color: '#fff',
        border: '1px solid transparent'
      },
      outline: {
        background: 'transparent',
        color: 'var(--foreground)',
        border: '1px solid var(--border)'
      },
      success: {
        background: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
        color: 'var(--color-success)',
        border: '1px solid color-mix(in srgb, var(--color-success) 35%, transparent)'
      },
      warning: {
        background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
        color: 'var(--warning)',
        border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)'
      },
      info: {
        background: 'color-mix(in srgb, var(--color-meeting) 18%, transparent)',
        color: 'var(--color-meeting)',
        border: '1px solid color-mix(in srgb, var(--color-meeting) 35%, transparent)'
      }
    }[variant];
    return h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        borderRadius: 'var(--radius-md)',
        padding: '2px 8px',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        width: 'fit-content',
        ...v,
        ...style
      },
      ...p
    }, children);
  });
  def('Card', function ({
    glass = false,
    style = {},
    children,
    ...p
  }) {
    return h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderRadius: 'var(--radius-2xl)',
        padding: 20,
        background: glass ? 'var(--nx-glass-bg)' : 'var(--card)',
        color: 'var(--card-foreground)',
        border: glass ? '1px solid var(--nx-glass-border)' : '1px solid var(--border)',
        boxShadow: glass ? 'var(--shadow-lg), var(--highlight-top)' : 'var(--shadow-sm)',
        backdropFilter: glass ? 'var(--nx-glass-blur)' : undefined,
        WebkitBackdropFilter: glass ? 'var(--nx-glass-blur)' : undefined,
        fontFamily: 'var(--font-sans)',
        ...style
      },
      ...p
    }, children);
  });
  def('CardHeader', ({
    style = {},
    children,
    ...p
  }) => h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      ...style
    },
    ...p
  }, children));
  def('CardTitle', ({
    style = {},
    children,
    ...p
  }) => h('div', {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--foreground)',
      ...style
    },
    ...p
  }, children));
  def('CardDescription', ({
    style = {},
    children,
    ...p
  }) => h('div', {
    style: {
      fontSize: 13,
      color: 'var(--muted-foreground)',
      ...style
    },
    ...p
  }, children));
  def('CardContent', ({
    style = {},
    children,
    ...p
  }) => h('div', {
    style: {
      fontSize: 14,
      ...style
    },
    ...p
  }, children));
  def('CardFooter', ({
    style = {},
    children,
    ...p
  }) => h('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      ...style
    },
    ...p
  }, children));
  def('Input', function ({
    invalid = false,
    style = {},
    ...p
  }) {
    return h('input', {
      style: {
        height: 36,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-md)',
        border: '1px solid ' + (invalid ? 'var(--destructive)' : 'var(--border)'),
        background: 'color-mix(in oklch, var(--input) 60%, transparent)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        padding: '0 12px',
        outline: 'none',
        ...style
      },
      ...p
    });
  });
  def('Select', function ({
    style = {},
    children,
    ...p
  }) {
    return h('select', {
      style: {
        height: 36,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'color-mix(in oklch, var(--input) 60%, transparent)',
        color: 'var(--foreground)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        padding: '0 12px',
        cursor: 'pointer',
        ...style
      },
      ...p
    }, children);
  });
  def('PlanBadge', function ({
    plan = 'PRO',
    style = {},
    ...p
  }) {
    const bg = plan === 'PRO' ? 'var(--color-primary-bg)' : 'transparent';
    return h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--radius-md)',
        border: '2px solid var(--nx-amber)',
        background: bg,
        color: plan === 'LITE' ? 'var(--nx-amber)' : 'var(--nx-amber-bright)',
        padding: '1px 8px',
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        ...style
      },
      ...p
    }, plan);
  });
  def('FieldBadge', function ({
    kind = 'required',
    children,
    style = {},
    ...p
  }) {
    const K = {
      required: ['var(--warning)', 'color-mix(in srgb, var(--warning) 16%, transparent)', 'color-mix(in srgb, var(--warning) 40%, transparent)', '必填'],
      locked: ['var(--muted-foreground)', 'color-mix(in oklch, var(--muted) 60%, transparent)', 'color-mix(in oklch, var(--border) 80%, transparent)', '建立後不可改'],
      auto: ['var(--color-meeting)', 'color-mix(in srgb, var(--color-meeting) 15%, transparent)', 'color-mix(in srgb, var(--color-meeting) 38%, transparent)', '系統自動'],
      advanced: ['var(--primary)', 'transparent', 'color-mix(in srgb, var(--primary) 45%, transparent)', '進階']
    }[kind] || [];
    return h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--radius-sm)',
        padding: '1px 6px',
        border: '1px solid ' + K[2],
        background: K[1],
        color: K[0],
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.02em',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        ...style
      },
      ...p
    }, children ?? K[3]);
  });
  def('DocStatusBadge', function ({
    status = 'D',
    label,
    style = {},
    ...p
  }) {
    const s = {
      D: ['var(--muted)', 'var(--muted-foreground)', 0],
      S: ['color-mix(in srgb, var(--color-meeting) 22%, transparent)', 'var(--color-meeting)', 0],
      R: ['color-mix(in srgb, var(--warning) 20%, transparent)', 'var(--warning)', 0],
      B: ['color-mix(in srgb, var(--warning) 20%, transparent)', 'var(--warning)', 0],
      C: ['color-mix(in srgb, var(--color-success) 22%, transparent)', 'var(--color-success)', 0],
      P: ['color-mix(in srgb, var(--color-success) 22%, transparent)', 'var(--color-success)', 0],
      V: ['var(--muted)', 'var(--muted-foreground)', 1],
      X: ['var(--muted)', 'var(--muted-foreground)', 1]
    }[String(status).toUpperCase()] || ['var(--muted)', 'var(--muted-foreground)', 0];
    return h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--radius-md)',
        background: s[0],
        color: s[1],
        padding: '2px 8px',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 600,
        textDecoration: s[2] ? 'line-through' : 'none',
        ...style
      },
      ...p
    }, label ?? status);
  });
  def('ToolbarButton', function ({
    letter,
    label,
    icon = null,
    variant = 'default',
    accent = false,
    pressed = false,
    disabled = false,
    style = {},
    ...p
  }) {
    const amber = !disabled && (accent || pressed);
    let pal;
    if (disabled) pal = {
      border: 'color-mix(in oklch, var(--border) 50%, transparent)',
      bg: 'color-mix(in oklch, var(--card) 60%, transparent)',
      fg: 'var(--muted-foreground)'
    };else if (variant === 'danger') pal = {
      border: 'color-mix(in srgb, var(--color-danger) 45%, var(--border))',
      bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
      fg: 'var(--color-danger)'
    };else if (amber) pal = {
      border: 'color-mix(in srgb, var(--nx-amber) 40%, transparent)',
      bg: 'color-mix(in srgb, var(--nx-amber) 14%, transparent)',
      fg: 'var(--nx-amber)'
    };else pal = {
      border: 'var(--border)',
      bg: 'color-mix(in oklch, var(--card) 80%, transparent)',
      fg: 'var(--foreground)'
    };
    return h('button', {
      type: 'button',
      disabled,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 9px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid ' + pal.border,
        background: pal.bg,
        color: pal.fg,
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style
      },
      ...p
    }, icon, letter ? h('span', {
      style: {
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: !disabled && variant !== 'danger' && !amber ? 'var(--nx-amber)' : 'inherit'
      }
    }, letter) : null, h('span', null, label));
  });
  def('StatCard', function ({
    category,
    label,
    value,
    unit,
    delta,
    deltaDir = 'up',
    style = {},
    ...p
  }) {
    const dc = deltaDir === 'down' ? 'var(--color-danger)' : 'var(--color-success)';
    return h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 116,
        padding: 16,
        borderRadius: 'var(--radius-2xl)',
        background: 'var(--nx-glass-bg)',
        border: '1px solid color-mix(in oklch, var(--border) 80%, transparent)',
        boxShadow: 'var(--shadow-lg), var(--highlight-top)',
        backdropFilter: 'var(--nx-glass-blur)',
        WebkitBackdropFilter: 'var(--nx-glass-blur)',
        fontFamily: 'var(--font-sans)',
        ...style
      },
      ...p
    }, h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column'
      }
    }, category ? h('span', {
      style: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wider)',
        color: 'var(--muted-foreground)'
      }
    }, category) : null, h('span', {
      style: {
        marginTop: 2,
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--foreground)'
      }
    }, label)), h('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8
      }
    }, h('span', {
      style: {
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 28,
        fontWeight: 600
      }
    }, value), unit ? h('span', {
      style: {
        fontSize: 12,
        color: 'var(--muted-foreground)'
      }
    }, unit) : null, delta ? h('span', {
      style: {
        marginLeft: 'auto',
        fontSize: 12,
        fontWeight: 600,
        color: dc
      }
    }, (deltaDir === 'down' ? '▼ ' : '▲ ') + delta) : null));
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp/fallback.jsx", error: String((e && e.message) || e) }); }

// ui_kits/purchase/PoApp.jsx
try { (() => {
// NEXORA GRID 進貨 — App shell for the 採購單 screens
function NXPoApp() {
  const [view, setView] = React.useState('list'); // 'list' | 'detail'

  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--background)',
      color: 'var(--foreground)'
    }
  }, /*#__PURE__*/React.createElement(window.NXTopBar, {
    active: "purchase",
    onNav: () => setView('list'),
    onLogout: () => setView('list')
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 'var(--shell-max-w)',
      margin: '0 auto',
      padding: '20px 16px 56px'
    }
  }, view === 'list' ? /*#__PURE__*/React.createElement(window.NXPoListScreen, {
    onOpen: () => setView('detail')
  }) : /*#__PURE__*/React.createElement(window.NXPoDetailScreen, {
    onBack: () => setView('list')
  })));
}
window.NXPoApp = NXPoApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/purchase/PoApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/purchase/PoDetailScreen.jsx
try { (() => {
// NEXORA GRID 進貨 — 採購單 詳細頁（表頭＋時間軸＋狀態動作＋明細）
function NXPoDetailScreen({
  onBack
}) {
  const {
    Button,
    Input,
    FieldBadge
  } = window.NEXORAGRIDDesignSystem_6998e4;
  const NXIcon = window.NXIcon;
  const {
    PoStatusBadge,
    StatusTimeline
  } = window;
  const D = window.NX_PO;
  const doc = D.detail;
  const [status, setStatus] = React.useState(doc.status);
  const [role, setRole] = React.useState(D.role); // '採購主管' | '業務'
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [banner, setBanner] = React.useState('');
  const showCost = role === '採購主管';
  const stageIdx = D.stages.findIndex(s => s.key === status);

  // received display by status (demo): RECEIVED = all, PARTIAL = first 3 lines partial
  const itemsView = doc.items.map((it, i) => {
    let received = 0;
    if (status === 'RECEIVED' || status === 'CLOSED') received = it.qty;else if (status === 'PARTIAL_RECEIVED') received = i < 3 ? Math.round(it.qty * 0.6) : 0;
    return {
      ...it,
      received
    };
  });
  const total = itemsView.reduce((s, it) => s + it.qty * it.unitCost, 0);
  const go = (next, msg) => {
    setStatus(next);
    setBanner(msg || '');
  };

  // state → action buttons (mirrors production PO state machine)
  const actions = [];
  if (status === 'DRAFT') {
    actions.push({
      k: 'submit',
      label: '送審',
      icon: 'send',
      variant: 'default',
      on: () => go('PENDING_APPROVAL')
    });
    actions.push({
      k: 'void',
      label: '作廢',
      icon: 'x',
      variant: 'destructive-outline',
      on: () => go('CANCELLED', '此採購單已作廢。')
    });
  } else if (status === 'PENDING_APPROVAL') {
    actions.push({
      k: 'approve',
      label: '核准',
      icon: 'checkCircle',
      variant: 'success',
      on: () => go('APPROVED')
    });
    actions.push({
      k: 'reject',
      label: '退件',
      icon: 'undo',
      variant: 'warning-outline',
      on: () => setRejectOpen(true)
    });
  } else if (status === 'APPROVED') {
    actions.push({
      k: 'send',
      label: '寄出廠商',
      icon: 'send',
      variant: 'default',
      on: () => go('SUBMITTED')
    });
  } else if (status === 'SUBMITTED') {
    actions.push({
      k: 'confirm',
      label: '廠商確認接單',
      icon: 'checkCircle',
      variant: 'success',
      on: () => go('CONFIRMED')
    });
  } else if (status === 'CONFIRMED' || status === 'PARTIAL_RECEIVED') {
    actions.push({
      k: 'rr',
      label: '轉進貨驗收',
      icon: 'truck',
      variant: 'default',
      on: () => go(status === 'CONFIRMED' ? 'PARTIAL_RECEIVED' : 'RECEIVED')
    });
  } else if (status === 'RECEIVED') {
    actions.push({
      k: 'close',
      label: '結案',
      icon: 'fileCheck',
      variant: 'success',
      on: () => go('CLOSED')
    });
  }
  const terminal = status === 'CLOSED' || status === 'CANCELLED';
  const renderActionBtn = a => {
    const map = {
      default: {
        background: 'var(--primary)',
        color: 'var(--primary-foreground)',
        border: '1px solid transparent'
      },
      success: {
        background: 'var(--color-success)',
        color: '#fff',
        border: '1px solid transparent'
      },
      'warning-outline': {
        background: 'transparent',
        color: 'var(--warning)',
        border: '1px solid color-mix(in srgb, var(--warning) 50%, transparent)'
      },
      'destructive-outline': {
        background: 'transparent',
        color: 'var(--color-danger)',
        border: '1px solid color-mix(in srgb, var(--color-danger) 45%, transparent)'
      }
    };
    return /*#__PURE__*/React.createElement("button", {
      key: a.k,
      onClick: a.on,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 38,
        padding: '0 16px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        ...map[a.variant]
      }
    }, /*#__PURE__*/React.createElement(NXIcon, {
      name: a.icon,
      size: 15
    }), a.label);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: 'none',
      border: 'none',
      color: 'var(--muted-foreground)',
      cursor: 'pointer',
      fontSize: 13,
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "chevronLeft",
    size: 16
  }), " \u63A1\u8CFC\u55AE\u5217\u8868"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "user2",
    size: 13
  }), " \u6AA2\u8996\u89D2\u8272", /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      overflow: 'hidden'
    }
  }, ['採購主管', '業務'].map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    onClick: () => setRole(r),
    style: {
      padding: '5px 10px',
      border: 'none',
      fontSize: 12,
      cursor: 'pointer',
      background: role === r ? 'color-mix(in srgb, var(--nx-amber) 16%, transparent)' : 'transparent',
      color: role === r ? 'var(--nx-amber)' : 'var(--muted-foreground)',
      fontWeight: role === r ? 600 : 500
    }
  }, r))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      letterSpacing: 'var(--tracking-widest)',
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase'
    }
  }, "\u9032\u8CA8 \xB7 \u63A1\u8CFC\u55AE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 600,
      fontFamily: 'var(--font-mono)'
    }
  }, doc.docNo), /*#__PURE__*/React.createElement(PoStatusBadge, {
    status: status,
    size: "lg"
  })))), banner ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 14px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
      background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
      color: 'var(--warning)',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "alertCircle",
    size: 15
  }), " ", banner) : null, /*#__PURE__*/React.createElement("div", {
    className: "nx-glass nx-glass-raised",
    style: {
      padding: '20px 20px 16px',
      borderRadius: 'var(--radius-2xl)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--muted-foreground)',
      marginBottom: 16
    }
  }, "\u55AE\u64DA\u6D41\u7A0B"), /*#__PURE__*/React.createElement(StatusTimeline, {
    stages: D.stages,
    status: status,
    timestamps: doc.timestamps
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      padding: 14,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      background: 'color-mix(in oklch, var(--card) 70%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: 'var(--muted-foreground)',
      marginRight: 4
    }
  }, "\u76EE\u524D\u53EF\u57F7\u884C\uFF1A"), actions.map(renderActionBtn), terminal ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--muted-foreground)'
    }
  }, status === 'CLOSED' ? '已結案' : '已作廢', "\uFF08\u7D42\u614B\uFF0C\u7121\u53EF\u57F7\u884C\u52D5\u4F5C\uFF09") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setStatus('DRAFT');
      setBanner('');
    },
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: 'none',
      border: '1px dashed color-mix(in oklch, var(--border) 90%, transparent)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--muted-foreground)',
      cursor: 'pointer',
      fontSize: 11,
      padding: '5px 10px'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "undo",
    size: 12
  }), " \u793A\u7BC4\uFF1A\u91CD\u8A2D\u70BA\u8349\u7A3F")), rejectOpen ? /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
      background: 'color-mix(in srgb, var(--warning) 8%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 6
    }
  }, "\u9000\u4EF6\u63A1\u8CFC\u55AE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--muted-foreground)',
      marginBottom: 10
    }
  }, "\u586B\u5BEB\u9000\u4EF6\u539F\u56E0\uFF0C\u63A1\u8CFC\u54E1\u6703\u770B\u5230\u6B64\u8A0A\u606F\uFF0C\u4FEE\u6539\u5F8C\u91CD\u9001\u3002"), /*#__PURE__*/React.createElement("textarea", {
    value: rejectReason,
    onChange: e => setRejectReason(e.target.value),
    rows: 2,
    placeholder: "\u4F8B\uFF1A\u55AE\u50F9\u8D85\u51FA\u672C\u6708\u9810\u7B97\u4E0A\u9650\uFF0C\u8ACB\u6539\u70BA\u6708\u7D50 60 \u5929\u518D\u9001\u3002",
    style: {
      width: '100%',
      boxSizing: 'border-box',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)',
      background: 'color-mix(in oklch, var(--input) 60%, transparent)',
      color: 'var(--foreground)',
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      padding: 10,
      outline: 'none',
      resize: 'vertical'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    onClick: () => setRejectOpen(false)
  }, "\u53D6\u6D88"), /*#__PURE__*/React.createElement("button", {
    disabled: !rejectReason.trim(),
    onClick: () => {
      setRejectOpen(false);
      go('DRAFT', '已退件：' + rejectReason.trim());
      setRejectReason('');
    },
    style: {
      height: 32,
      padding: '0 14px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      background: rejectReason.trim() ? 'var(--warning)' : 'color-mix(in oklch, var(--muted) 60%, transparent)',
      color: rejectReason.trim() ? '#1a1a1a' : 'var(--muted-foreground)',
      fontSize: 13,
      fontWeight: 600,
      cursor: rejectReason.trim() ? 'pointer' : 'not-allowed'
    }
  }, "\u78BA\u5B9A\u9000\u4EF6"))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-2xl)',
      border: '1px solid var(--border)',
      background: 'color-mix(in oklch, var(--card) 70%, transparent)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--muted-foreground)',
      marginBottom: 16
    }
  }, "\u8868\u982D\u8CC7\u6599"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px 24px'
    }
  }, /*#__PURE__*/React.createElement(HField, {
    label: "\u55AE\u865F",
    badge: "auto",
    mono: true
  }, doc.docNo), /*#__PURE__*/React.createElement(HField, {
    label: "\u958B\u55AE\u65E5\u671F",
    badge: "auto",
    mono: true
  }, doc.poDate), /*#__PURE__*/React.createElement(HField, {
    label: "\u958B\u55AE\u4EBA\u54E1",
    badge: "auto"
  }, doc.owner), /*#__PURE__*/React.createElement(HField, {
    label: "\u4F9B\u61C9\u5546",
    badge: "required"
  }, doc.supplier, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, doc.supplierCode)), /*#__PURE__*/React.createElement(HField, {
    label: "\u4ED8\u6B3E\u5C0D\u8C61"
  }, doc.invoiceTo), /*#__PURE__*/React.createElement(HField, {
    label: "\u6307\u9001\u5C0D\u8C61"
  }, doc.shipTo), /*#__PURE__*/React.createElement(HField, {
    label: "\u6536\u8CA8\u5730\u5740"
  }, doc.shipAddress), /*#__PURE__*/React.createElement(HField, {
    label: "\u4EA4\u8CA8\u5730\u9EDE"
  }, doc.deliveryPlace), /*#__PURE__*/React.createElement(HField, {
    label: "\u9810\u8A08\u5230\u8CA8\u65E5"
  }, doc.expectedDate)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      paddingTop: 14,
      borderTop: '1px solid color-mix(in oklch, var(--border) 40%, transparent)'
    }
  }, /*#__PURE__*/React.createElement(HField, {
    label: "\u5099\u8A3B"
  }, doc.remark))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-2xl)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      background: 'color-mix(in oklch, var(--card) 40%, var(--background))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      borderBottom: '1px solid color-mix(in oklch, var(--border) 40%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "\u63A1\u8CFC\u660E\u7D30"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, itemsView.length, " \u7B46\u6599\u4EF6"), !showCost ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, /*#__PURE__*/React.createElement(NXIcon, {
    name: "alertCircle",
    size: 13,
    style: {
      color: 'var(--warning)'
    }
  }), " \u696D\u52D9\u89D2\u8272\uFF1A\u55AE\u50F9\uFF0F\u91D1\u984D\uFF08\u6210\u672C\uFF09\u5DF2\u4F9D\u6B0A\u9650\u96B1\u85CF") : null), /*#__PURE__*/React.createElement("div", {
    className: "nx-scroll",
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      minWidth: showCost ? 880 : 680,
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'color-mix(in oklch, var(--background) 55%, transparent)',
      borderBottom: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)'
    }
  }, ['項次', '料號 / 廠牌料號', '品名', '數量', '已進量 / 取消量', ...(showCost ? ['單價', '金額'] : []), '預交貨日'].map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      padding: '10px 12px',
      textAlign: i >= 3 && i <= (showCost ? 6 : 4) ? 'right' : 'left',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, itemsView.map((it, i) => {
    const remain = it.qty - it.received - it.cancelled;
    const tdc = {
      padding: '10px 12px',
      fontSize: 13,
      borderBottom: '1px solid color-mix(in oklch, var(--border) 25%, transparent)',
      verticalAlign: 'top'
    };
    return /*#__PURE__*/React.createElement("tr", {
      key: it.line,
      style: {
        background: i % 2 ? 'color-mix(in oklch, var(--foreground) 3%, transparent)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        fontFamily: 'var(--font-mono)',
        color: 'var(--muted-foreground)'
      }
    }, String(it.line).padStart(2, '0')), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        fontFamily: 'var(--font-mono)',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--foreground)'
      }
    }, it.partNo), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2,
        fontSize: 10,
        color: 'var(--muted-foreground)'
      },
      title: "\u5EE0\u724C\u6599\u865F"
    }, it.vendorPartNo)), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        fontWeight: 500
      }
    }, it.name), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, it.qty.toLocaleString()), /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: it.received > 0 ? 'var(--color-success)' : 'var(--muted-foreground)'
      }
    }, it.received.toLocaleString()), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 2,
        fontSize: 10,
        color: 'var(--muted-foreground)'
      }
    }, it.cancelled > 0 ? `取消 ${it.cancelled}` : remain > 0 && it.received > 0 ? `待收 ${remain}` : '\u00a0')), showCost ? /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums'
      }
    }, it.unitCost.toLocaleString()) : null, showCost ? /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600
      }
    }, (it.qty * it.unitCost).toLocaleString()) : null, /*#__PURE__*/React.createElement("td", {
      style: {
        ...tdc,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--muted-foreground)'
      }
    }, it.dueDate));
  })), showCost ? /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 6,
    style: {
      padding: '12px',
      textAlign: 'right',
      fontWeight: 600,
      fontSize: 13
    }
  }, "\u5408\u8A08\uFF08\u672A\u7A05\uFF09"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 700,
      fontSize: 15,
      color: 'var(--primary)'
    }
  }, "NT$ ", total.toLocaleString()), /*#__PURE__*/React.createElement("td", null))) : null))));
}
function HField({
  label,
  badge,
  mono,
  children
}) {
  const {
    FieldBadge
  } = window.NEXORAGRIDDesignSystem_6998e4;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, label), badge ? /*#__PURE__*/React.createElement(FieldBadge, {
    kind: badge
  }) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--foreground)',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)'
    }
  }, children));
}
window.NXPoDetailScreen = NXPoDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/purchase/PoDetailScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/purchase/PoListScreen.jsx
try { (() => {
// NEXORA GRID 進貨 — 採購單 清單頁
function NXPoListScreen({
  onOpen
}) {
  const {
    ToolbarButton,
    Input,
    Select
  } = window.NEXORAGRIDDesignSystem_6998e4;
  const NXIcon = window.NXIcon;
  const PoStatusBadge = window.PoStatusBadge;
  const D = window.NX_PO;
  const [status, setStatus] = React.useState('');
  const [supplier, setSupplier] = React.useState('');
  const [q, setQ] = React.useState('');
  const suppliers = Array.from(new Set(D.list.map(r => r.supplier)));
  const rows = D.list.filter(r => (status === '' || r.status === status) && (supplier === '' || r.supplier === supplier) && (q === '' || r.docNo.toLowerCase().includes(q.toLowerCase()) || r.supplier.includes(q)));
  const th = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--muted-foreground)',
    whiteSpace: 'nowrap'
  };
  const td = {
    padding: '11px 12px',
    fontSize: 13,
    borderBottom: '1px solid color-mix(in oklch, var(--border) 30%, transparent)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 11,
      letterSpacing: 'var(--tracking-widest)',
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase'
    }
  }, "\u9032\u8CA8"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '2px 0 0',
      fontSize: 24,
      fontWeight: 600
    }
  }, "\u63A1\u8CFC\u55AE")), /*#__PURE__*/React.createElement(ToolbarButton, {
    letter: "A",
    label: "\u65B0\u589E\u63A1\u8CFC\u55AE",
    accent: true,
    icon: /*#__PURE__*/React.createElement(NXIcon, {
      name: "plus",
      size: 13
    })
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'flex-end',
      padding: 14,
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      background: 'color-mix(in oklch, var(--card) 70%, transparent)',
      boxShadow: 'var(--highlight-top)'
    }
  }, /*#__PURE__*/React.createElement(Filter, {
    label: "\u72C0\u614B"
  }, /*#__PURE__*/React.createElement(Select, {
    value: status,
    onChange: e => setStatus(e.target.value),
    style: {
      height: 34,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u5168\u90E8\u72C0\u614B"), D.stages.map(s => /*#__PURE__*/React.createElement("option", {
    key: s.key,
    value: s.key
  }, s.label)), /*#__PURE__*/React.createElement("option", {
    value: "CANCELLED"
  }, "\u4F5C\u5EE2"))), /*#__PURE__*/React.createElement(Filter, {
    label: "\u4F9B\u61C9\u5546"
  }, /*#__PURE__*/React.createElement(Select, {
    value: supplier,
    onChange: e => setSupplier(e.target.value),
    style: {
      height: 34,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u5168\u90E8\u4F9B\u61C9\u5546"), suppliers.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement(Filter, {
    label: "\u958B\u55AE\u65E5\u671F"
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date",
    defaultValue: "2026-06-01",
    style: {
      height: 34,
      fontSize: 13
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 160
    }
  }, /*#__PURE__*/React.createElement(Filter, {
    label: "\u95DC\u9375\u5B57"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "\u641C\u5C0B\u55AE\u865F / \u4F9B\u61C9\u5546\u2026",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      height: 34,
      fontSize: 13
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'color-mix(in oklch, var(--card) 40%, var(--background))'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "nx-scroll",
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      minWidth: 760,
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'color-mix(in oklch, var(--background) 55%, transparent)',
      borderBottom: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      width: 56
    }
  }, "\u5E8F\u865F"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u55AE\u865F"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u4F9B\u61C9\u5546"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u958B\u55AE\u65E5"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'center'
    }
  }, "\u660E\u7D30"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "\u91D1\u984D"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "\u72C0\u614B"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.docNo,
    onClick: () => onOpen(r.docNo),
    style: {
      cursor: 'pointer',
      background: i % 2 ? 'color-mix(in oklch, var(--foreground) 3%, transparent)' : 'transparent',
      transition: 'background var(--dur-fast)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'color-mix(in srgb, var(--nx-amber) 9%, transparent)',
    onMouseLeave: e => e.currentTarget.style.background = i % 2 ? 'color-mix(in oklch, var(--foreground) 3%, transparent)' : 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--muted-foreground)'
    }
  }, String(i + 1).padStart(4, '0')), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--primary)',
      fontWeight: 600
    }
  }, r.docNo), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 500
    }
  }, r.supplier, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--muted-foreground)'
    }
  }, r.supplierCode)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--muted-foreground)'
    }
  }, r.poDate), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums',
      color: 'var(--muted-foreground)'
    }
  }, r.items), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, "NT$ ", r.amount.toLocaleString()), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(PoStatusBadge, {
    status: r.status
  }))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      borderTop: '1px solid var(--border)',
      fontSize: 11,
      color: 'var(--muted-foreground)',
      background: 'color-mix(in oklch, var(--background) 50%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\u5171 ", D.list.length, " \u7B46 \xB7 \u986F\u793A ", rows.length, " \u7B46"), /*#__PURE__*/React.createElement("span", null, "\u6BCF\u9801 20 \u7B46"))));
}
function Filter({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: 'var(--muted-foreground)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 150
    }
  }, children));
}
window.NXPoListScreen = NXPoListScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/purchase/PoListScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/purchase/PoParts.jsx
try { (() => {
// NEXORA GRID 進貨 — PoStatusBadge + StatusTimeline (shared across purchase docs)
(function () {
  const h = React.createElement;
  const NXIcon = window.NXIcon;

  // 9-status colour map. Phase logic: draft=muted, pending=warning,
  // approved/sent/confirmed=info blue, partial=warning, received/closed=success,
  // cancelled=danger.
  const STATUS = window.NX_PO_STATUS = {
    DRAFT: {
      label: '草稿',
      fg: 'var(--muted-foreground)',
      bg: 'color-mix(in oklch, var(--muted) 60%, transparent)',
      bd: 'color-mix(in oklch, var(--border) 80%, transparent)'
    },
    PENDING_APPROVAL: {
      label: '待核准',
      fg: 'var(--warning)',
      bg: 'color-mix(in srgb, var(--warning) 16%, transparent)',
      bd: 'color-mix(in srgb, var(--warning) 40%, transparent)'
    },
    APPROVED: {
      label: '已核准',
      fg: 'var(--color-meeting)',
      bg: 'color-mix(in srgb, var(--color-meeting) 15%, transparent)',
      bd: 'color-mix(in srgb, var(--color-meeting) 38%, transparent)'
    },
    SUBMITTED: {
      label: '已寄廠商',
      fg: 'var(--color-meeting)',
      bg: 'color-mix(in srgb, var(--color-meeting) 15%, transparent)',
      bd: 'color-mix(in srgb, var(--color-meeting) 38%, transparent)'
    },
    CONFIRMED: {
      label: '廠商確認',
      fg: 'var(--color-meeting)',
      bg: 'color-mix(in srgb, var(--color-meeting) 22%, transparent)',
      bd: 'color-mix(in srgb, var(--color-meeting) 55%, transparent)'
    },
    PARTIAL_RECEIVED: {
      label: '部分驗收',
      fg: 'var(--warning)',
      bg: 'color-mix(in srgb, var(--warning) 16%, transparent)',
      bd: 'color-mix(in srgb, var(--warning) 40%, transparent)'
    },
    RECEIVED: {
      label: '全部驗收',
      fg: 'var(--color-success)',
      bg: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
      bd: 'color-mix(in srgb, var(--color-success) 45%, transparent)'
    },
    CLOSED: {
      label: '已結案',
      fg: 'var(--color-success)',
      bg: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
      bd: 'color-mix(in srgb, var(--color-success) 32%, transparent)'
    },
    CANCELLED: {
      label: '作廢',
      fg: 'var(--color-danger)',
      bg: 'color-mix(in srgb, var(--color-danger) 14%, transparent)',
      bd: 'color-mix(in srgb, var(--color-danger) 35%, transparent)'
    }
  };
  window.PoStatusBadge = function ({
    status,
    size = 'md',
    style = {}
  }) {
    const s = STATUS[status] || STATUS.DRAFT;
    const pad = size === 'lg' ? '4px 12px' : '2px 9px';
    const fs = size === 'lg' ? 14 : 12;
    return h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        borderRadius: 'var(--radius-md)',
        padding: pad,
        border: '1px solid ' + s.bd,
        background: s.bg,
        color: s.fg,
        fontFamily: 'var(--font-sans)',
        fontSize: fs,
        fontWeight: 600,
        textDecoration: status === 'CANCELLED' ? 'line-through' : 'none',
        whiteSpace: 'nowrap',
        ...style
      }
    }, h('span', {
      style: {
        width: 6,
        height: 6,
        borderRadius: 999,
        background: s.fg,
        flexShrink: 0
      }
    }), s.label);
  };

  // Horizontal workflow timeline. props: stages [{key,label}], status (current key),
  // timestamps {key: 'YYYY-MM-DD HH:mm'}, cancelled (bool)
  window.StatusTimeline = function ({
    stages,
    status,
    timestamps = {}
  }) {
    const cancelled = status === 'CANCELLED';
    const curIdx = stages.findIndex(s => s.key === status);
    return h('div', {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        width: '100%',
        overflowX: 'auto',
        paddingBottom: 4
      },
      className: 'nx-scroll'
    }, stages.map((st, i) => {
      const done = !cancelled && i < curIdx;
      const current = !cancelled && i === curIdx;
      const future = cancelled || i > curIdx;
      const dotBg = current ? 'var(--primary)' : done ? 'color-mix(in srgb, var(--primary) 88%, var(--background))' : 'transparent';
      const dotBd = future ? 'color-mix(in oklch, var(--border) 90%, transparent)' : 'var(--primary)';
      const dotFg = current || done ? 'var(--primary-foreground)' : 'var(--muted-foreground)';
      const connBefore = i > 0 ? i <= curIdx && !cancelled ? 'var(--primary)' : 'color-mix(in oklch, var(--border) 80%, transparent)' : 'transparent';
      const ts = timestamps[st.key];
      return h('div', {
        key: st.key,
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flex: 1,
          minWidth: 84,
          position: 'relative'
        }
      },
      // connector + dot row
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          width: '100%'
        }
      }, h('div', {
        style: {
          height: 2,
          flex: 1,
          background: connBefore
        }
      }), h('div', {
        style: {
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 999,
          border: '2px solid ' + dotBd,
          background: dotBg,
          color: dotFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: current ? 'var(--nx-glow-primary)' : 'none'
        }
      }, done ? h(NXIcon, {
        name: 'check',
        size: 13,
        strokeWidth: 3
      }) : current ? h('span', {
        style: {
          width: 7,
          height: 7,
          borderRadius: 999,
          background: 'var(--primary-foreground)'
        }
      }) : h('span', {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600
        }
      }, i + 1)), h('div', {
        style: {
          height: 2,
          flex: 1,
          background: i < stages.length - 1 ? i < curIdx && !cancelled ? 'var(--primary)' : 'color-mix(in oklch, var(--border) 80%, transparent)' : 'transparent'
        }
      })),
      // label
      h('div', {
        style: {
          marginTop: 8,
          fontSize: 12,
          fontWeight: current ? 600 : 500,
          color: current ? 'var(--primary)' : done ? 'var(--foreground)' : 'var(--muted-foreground)',
          textAlign: 'center',
          whiteSpace: 'nowrap'
        }
      }, st.label), ts ? h('div', {
        style: {
          marginTop: 2,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--muted-foreground)',
          textAlign: 'center'
        }
      }, ts.slice(5)) : null);
    }));
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/purchase/PoParts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/purchase/data.js
try { (() => {
// NEXORA GRID — 進貨/採購單 mock data
window.NX_PO = {
  role: '採購主管',
  // 採購主管 sees cost; switch to 業務 to hide cost columns

  // 採購單 9-stage lifecycle (CANCELLED 作廢 is off-timeline)
  stages: [{
    key: 'DRAFT',
    label: '草稿'
  }, {
    key: 'PENDING_APPROVAL',
    label: '待核准'
  }, {
    key: 'APPROVED',
    label: '已核准'
  }, {
    key: 'SUBMITTED',
    label: '已寄廠商'
  }, {
    key: 'CONFIRMED',
    label: '廠商確認'
  }, {
    key: 'PARTIAL_RECEIVED',
    label: '部分驗收'
  }, {
    key: 'RECEIVED',
    label: '全部驗收'
  }, {
    key: 'CLOSED',
    label: '結案'
  }],
  list: [{
    docNo: 'PO-2026-0231',
    supplier: '統一精密工業',
    supplierCode: 'S-1042',
    poDate: '2026-06-08',
    expectedDate: '2026-06-20',
    owner: '陳柏宏',
    items: 6,
    amount: 372000,
    status: 'CONFIRMED'
  }, {
    docNo: 'PO-2026-0230',
    supplier: '台灣電綜貿易',
    supplierCode: 'S-0887',
    poDate: '2026-06-07',
    expectedDate: '2026-06-18',
    owner: '林佩珊',
    items: 3,
    amount: 84600,
    status: 'PARTIAL_RECEIVED'
  }, {
    docNo: 'PO-2026-0229',
    supplier: '和泰零件',
    supplierCode: 'S-0210',
    poDate: '2026-06-07',
    expectedDate: '2026-06-15',
    owner: '陳柏宏',
    items: 12,
    amount: 1251000,
    status: 'PENDING_APPROVAL'
  }, {
    docNo: 'PO-2026-0228',
    supplier: '三葉汽材',
    supplierCode: 'S-0455',
    poDate: '2026-06-06',
    expectedDate: '2026-06-16',
    owner: '王志明',
    items: 4,
    amount: 46200,
    status: 'DRAFT'
  }, {
    docNo: 'PO-2026-0227',
    supplier: '日新工業',
    supplierCode: 'S-1180',
    poDate: '2026-06-05',
    expectedDate: '2026-06-12',
    owner: '林佩珊',
    items: 8,
    amount: 528400,
    status: 'RECEIVED'
  }, {
    docNo: 'PO-2026-0226',
    supplier: '統一精密工業',
    supplierCode: 'S-1042',
    poDate: '2026-06-04',
    expectedDate: '2026-06-11',
    owner: '陳柏宏',
    items: 5,
    amount: 219800,
    status: 'APPROVED'
  }, {
    docNo: 'PO-2026-0225',
    supplier: '大同車料',
    supplierCode: 'S-0733',
    poDate: '2026-06-03',
    expectedDate: '2026-06-10',
    owner: '王志明',
    items: 2,
    amount: 18900,
    status: 'CLOSED'
  }, {
    docNo: 'PO-2026-0224',
    supplier: '長榮零件',
    supplierCode: 'S-0309',
    poDate: '2026-06-02',
    expectedDate: '2026-06-09',
    owner: '林佩珊',
    items: 7,
    amount: 96400,
    status: 'SUBMITTED'
  }, {
    docNo: 'PO-2026-0223',
    supplier: '三葉汽材',
    supplierCode: 'S-0455',
    poDate: '2026-06-01',
    expectedDate: '—',
    owner: '王志明',
    items: 3,
    amount: 33500,
    status: 'CANCELLED'
  }],
  // Rich detail doc — opened from PO-2026-0231 (CONFIRMED)
  detail: {
    docNo: 'PO-2026-0231',
    status: 'CONFIRMED',
    poDate: '2026-06-08',
    owner: '陳柏宏',
    supplier: '統一精密工業',
    supplierCode: 'S-1042',
    invoiceTo: '跟供應商同',
    shipTo: '亞羅汽材行 — 台中總倉',
    shipAddress: '台中市西屯區工業區一路 88 號',
    deliveryPlace: '—（進總倉，非直送）',
    expectedDate: '2026-06-20',
    remark: '季度安全庫存補貨；廠商確認後請優先處理煞車件。',
    timestamps: {
      PENDING_APPROVAL: '2026-06-08 10:24',
      APPROVED: '2026-06-08 14:02',
      SUBMITTED: '2026-06-08 16:30',
      CONFIRMED: '2026-06-09 09:15'
    },
    items: [{
      line: 1,
      partNo: 'BRK-PAD-0042',
      vendorPartNo: 'NB-AY040',
      name: '前煞車來令片',
      qty: 600,
      received: 0,
      cancelled: 0,
      unitCost: 168,
      dueDate: '2026-06-18'
    }, {
      line: 2,
      partNo: 'OIL-FLT-0118',
      vendorPartNo: 'DS-15208',
      name: '機油濾芯',
      qty: 400,
      received: 0,
      cancelled: 0,
      unitCost: 52,
      dueDate: '2026-06-18'
    }, {
      line: 3,
      partNo: 'SPK-PLG-0205',
      vendorPartNo: 'NGK-ILZKR7',
      name: '銥合金火星塞',
      qty: 480,
      received: 0,
      cancelled: 0,
      unitCost: 132,
      dueDate: '2026-06-20'
    }, {
      line: 4,
      partNo: 'BLT-TMG-0067',
      vendorPartNo: 'GT-T295',
      name: '正時皮帶組',
      qty: 60,
      received: 0,
      cancelled: 0,
      unitCost: 880,
      dueDate: '2026-06-20'
    }, {
      line: 5,
      partNo: 'AIR-FLT-0090',
      vendorPartNo: 'DS-17801',
      name: '空氣濾芯',
      qty: 300,
      received: 0,
      cancelled: 0,
      unitCost: 95,
      dueDate: '2026-06-19'
    }, {
      line: 6,
      partNo: 'WPR-BLD-0024',
      vendorPartNo: 'BO-A24S',
      name: '矽膠雨刷 24"',
      qty: 200,
      received: 0,
      cancelled: 0,
      unitCost: 156,
      dueDate: '2026-06-19'
    }]
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/purchase/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.CardTitle = __ds_scope.CardTitle;

__ds_ns.CardDescription = __ds_scope.CardDescription;

__ds_ns.CardContent = __ds_scope.CardContent;

__ds_ns.CardFooter = __ds_scope.CardFooter;

__ds_ns.DocStatusBadge = __ds_scope.DocStatusBadge;

__ds_ns.PlanBadge = __ds_scope.PlanBadge;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.ToolbarButton = __ds_scope.ToolbarButton;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FieldBadge = __ds_scope.FieldBadge;

__ds_ns.FormField = __ds_scope.FormField;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

})();
