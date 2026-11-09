    function ImportButton({ onDismiss }) {
      const t = useTranslate();
      const [visible, setVisible] = useState(cachedSidebarButton);
      useEffect(() => {
        const listener = (val) => setVisible(val);
        sidebarButtonListeners.add(listener);
        loadPrefsView().then((d) => {
          if (d && d.ok && typeof d.value?.sidebarButton === "boolean") {
            setSidebarButton(d.value.sidebarButton);
          }
        }).catch(() => {});
        return () => { sidebarButtonListeners.delete(listener); };
      }, []);
      if (!visible) return null;
      const { MenuItemButton } = require("@deepseek-ai/dsh-client-ui-primitives");
      return h(MenuItemButton, {
        icon: h(LogoIcon, { size: 16 }),
        title: t("trigger.title"),
        onSelect: () => {
          onDismiss?.();
          openNativeImportTab();
        },
      }, t("trigger.label"));
    }

    const name = "import-claude";
    // locale 是晚挂载服务（dsh-client-locale 自身依赖 connection/remote），声明进
    // inject 让 apply 期 ctx.get('locale') 就绪（面板 i18n + 字典注册）。sidebarRightTabs
    // 是官方原生右侧栏的 tab 注册服务（dsh ≥ 0.1.5-rc.1 恒有，peerDependencies 已抬
    // 门槛）：声明进 inject = 激活即服务就绪，右侧栏为硬依赖，无回落链。
    const inject = ["slots", "locale", "sidebarRightTabs"];

    function apply(ctx) {
      // Our desktop companion is only visible when a remote host is selected.
      if (window.__DSH_HOST_SWITCHER__?.selected === "local") return;
      // 交给 settings.js 的传输层：0.1.7 的设置值走客户端 configForms，需要客户端 ctx。
      setClientHostCtx(ctx);
      // locale 服务（@deepseek-ai/dsh-client-locale）：已声明进 inject，apply 期就绪；
      // 注册面板字典并随 DSH web 语言切换（缺失时 useTranslate 降级内置 zh 字典）。
      const locale = ctx.get("locale");
      if (locale && typeof locale.register === "function" && typeof locale.bind === "function") {
        localeSvc = locale;
        ctx.effect(() => locale.register(LOCALE_NS, { zh: DICT.zh, en: DICT.en }));
      }
      // 官方原生右侧栏（@deepseek-ai/dsh-client-ui-sidebar-right，DSH ≥ 0.1.5-rc.1）是硬
      // 依赖：inject 声明 sidebarRightTabs + peerDependencies 抬门槛，apply 期服务必
      // 就绪——无回落链（better-sidebar 集成与自绘 ShellPanel 已随依赖抬升一并删除）。
      // 注册 tab 类型（id/kind = chat-import，title 供 chip 与 guide 标题）与 guide 胶囊
      //（图标 + 标题 + 描述）；面板主体走 sidebar.right.pane.tab 槽（session 作用域、
      // keyed by 类型 id）。该槽由 ui-sidebar-right 的 rightbar.session 条目声明，晚于
      // 本插件 apply 期 → slots.inject 挂到声明就绪时注册（时序机制，不是回落）。
      const tabs = ctx.get("sidebarRightTabs");
      const label = () => (localeSvc ? localeSvc.bind(LOCALE_NS)("trigger.label") : (DICT.zh["trigger.label"] || "导入会话"));
      const guideDescription = () => (localeSvc ? localeSvc.bind(LOCALE_NS)("sidebar.guide.description") : (DICT.zh["sidebar.guide.description"] || ""));
      ctx.effect(() => tabs.register({
        id: IMPORT_TAB_TYPE,
        kind: IMPORT_TAB_TYPE,
        title: label,
        guide: [{
          order: 20, // guide 页排在官方 Files（order 10）之后
          title: label,
          description: guideDescription,
          icon: ImportGlyph,
        }],
      }), "dsh-chat-import: 右侧栏 tab 类型注册");
      ctx.slots.inject("sidebar.right.pane.tab", () =>
        ctx.slots.register(
          { name: "sidebar.right.pane.tab", key: IMPORT_TAB_TYPE },
          SidebarImportTab,
        ));
      // footer 按钮的右栏打开面：每次点击重证 sidebarRight 服务——无挂载会话、服务被
      // HMR 换掉等失败返回 false，本次点击无动作（依赖门槛保证受支持版本服务恒存在；
      // 参照 dsh-context 的 openContextSidebar；空 catch 吞掉的就是「本次打开」这一下，
      // 下一击重新尝试）。
      openNativeImportTab = () => {
        try {
          const face = ctx.get("sidebarRight");
          if (!face || typeof face.openTab !== "function") return false;
          face.openTab(IMPORT_TAB_TYPE);
          return true;
        } catch (_) {
          return false;
        }
      };
      // 裸 slots.register 要求槽在 apply 期已被 ui-sidebar 声明，advanced shell 下
      // 声明时序不保证先于本插件 -> fiber 抛错、renderer boot 判失败（白屏）。
      // slots.inject 挂起等声明就绪（官方 ui-cordis / dsh-community-market 同款）。
      ctx.slots.inject("sidebar.panellist.actions", () =>
        ctx.slots.register(
          { name: "sidebar.panellist.actions", id: "chat-import", order: 0 },
          ImportButton,
        ));
      // 落点 Toast 的挂载点：官方 shell.overlay（与宿主自己的 toast 同一个槽，例如
      // ui-plugin-manager 的 plugin-manager.refresh-toast）。惰性 inject：槽被声明才注册。
      ctx.slots.inject("shell.overlay", () =>
        ctx.slots.register(
          { name: "shell.overlay", id: "chat-import.landing-toast", locale: LOCALE_NS, inject: () => ({}) },
          ToastHost,
        ));
      // 设置席位按宿主世代分流（对齐 dsh-claude-style）：
      //   0.1.7+ —— 插件页 plugins.bundle.config（键 = 包名），由 ui-plugin-manager 声明，
      //             渲染在「设置 → 插件 → dsh-chat-import」；值走客户端 configForms。
      //   旧宿主 —— settings.section 整页（设置页左侧导航「每功能一页」）；值走 fenced
      //             路由 /api-import/prefs。
      // 两个 slots.inject 都是惰性的：槽被声明才触发（旧宿主不声明 plugins.bundle.config，
      // 新宿主仍声明 settings.section），再用 configForms 是否存在否决整页在新宿主上的
      // 重复注册——否则同一个设置会在两处各长一份。label 用 thunk 跟随语言切换。
      const settingsLabel = () => (localeSvc ? localeSvc.bind(LOCALE_NS)("settings.tab") : (DICT.zh["settings.tab"] || "会话导入"));
      ctx.effect(
        () => registerSettingsNavIcon(settingsLabel),
        "dsh-chat-import: settings navigation icon",
      );
      ctx.slots.inject("plugins.bundle.config", () =>
        ctx.slots.register(
          { name: "plugins.bundle.config", key: "dsh-chat-import", label: settingsLabel },
          ImportSettingsSection,
        ));
      ctx.slots.inject("settings.section", () => {
        if (hostConfigForms()) return undefined;
        return ctx.slots.register(
          { name: "settings.section", id: "chat-import", order: 21, label: settingsLabel, locale: LOCALE_NS, inject: () => ({}) },
          ImportSettingsSection,
        );
      });
    }
