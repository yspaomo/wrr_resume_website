figma.showUI(__html__, { width: 380, height: 420 });

function log(text) {
  figma.ui.postMessage({ type: "log", text: String(text) });
}

function fail(text) {
  figma.ui.postMessage({ type: "error", text: String(text) });
}

function done(text) {
  figma.ui.postMessage({ type: "done", text: String(text) });
}

function walk(node, fn) {
  fn(node);
  if ("children" in node) {
    for (let i = 0; i < node.children.length; i++) walk(node.children[i], fn);
  }
}

function findNamed(root, name, type) {
  let found = null;
  walk(root, function (n) {
    if (found) return;
    if (n.name === name && (!type || n.type === type)) found = n;
  });
  return found;
}

function findAllNamed(root, name, type) {
  const out = [];
  walk(root, function (n) {
    if (n.name === name && (!type || n.type === type)) out.push(n);
  });
  return out;
}

async function setChars(node, text) {
  if (!node || node.type !== "TEXT") return false;
  try {
    if (node.fontName === figma.mixed) {
      const fonts = node.getRangeAllFontNames(0, node.characters.length);
      for (let i = 0; i < fonts.length; i++) {
        try {
          await figma.loadFontAsync(fonts[i]);
        } catch (e) {}
      }
    } else {
      await figma.loadFontAsync(node.fontName);
    }
  } catch (e) {
    const fonts = await figma.listAvailableFontsAsync();
    const sc = fonts.find(function (f) {
      return f.fontName.family === "Noto Sans SC" && f.fontName.style === "Regular";
    });
    const fallback = sc
      ? sc.fontName
      : { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(fallback);
    node.fontName = fallback;
  }
  node.characters = text;
  return true;
}

function firstText(node) {
  let found = null;
  walk(node, function (n) {
    if (!found && n.type === "TEXT") found = n;
  });
  return found;
}

function hideRequired(instance) {
  if (!instance || instance.type !== "INSTANCE") return;
  try {
    instance.setProperties({
      "required#5678:17": false,
      "required_icon#5678:19": false,
      "info#5678:15": false,
      "info_icon#5678:13": false,
    });
  } catch (e) {}
  walk(instance, function (n) {
    if (n.name === "*" && "visible" in n) n.visible = false;
  });
}

async function findPageFrame() {
  const pages = figma.root.children.filter(function (p) {
    return p.type === "PAGE";
  });
  for (let i = 0; i < pages.length; i++) {
    await figma.setCurrentPageAsync(pages[i]);
    const frame = pages[i].findOne(function (n) {
      return n.type === "FRAME" && n.name === "门户运营端-产品公告";
    });
    if (frame) return frame;
  }
  const byId = await figma.getNodeByIdAsync("47:1038");
  if (byId && byId.type === "FRAME") return byId;
  return null;
}

async function findPaginationSet() {
  const byId = await figma.getNodeByIdAsync("3:3279");
  if (byId && byId.type === "COMPONENT_SET") return byId;
  for (let i = 0; i < figma.root.children.length; i++) {
    const page = figma.root.children[i];
    if (page.type !== "PAGE") continue;
    await figma.setCurrentPageAsync(page);
    const set = page.findOne(function (n) {
      return n.type === "COMPONENT_SET" && n.name === "Pagination";
    });
    if (set) return set;
  }
  return null;
}

const ROWS = [
  { status: "已发布", color: "green", time: "--", views: "50", acts: ["编辑", "预览", "下架", "取消置顶"] },
  { status: "已发布", color: "green", time: "2025-10-16 19:45", views: "70", acts: ["编辑", "预览", "下架", "置顶"] },
  { status: "已发布", color: "green", time: "2025-10-14 06:46", views: "36", acts: ["编辑", "预览", "下架", "置顶"] },
  { status: "草稿", color: "blue", time: "2025-09-28 19:46", views: "89", acts: ["编辑", "预览", "发布", "删除"] },
  { status: "已下架", color: "gay", time: "2025-10-03 21:57", views: "61", acts: ["编辑", "预览", "上架", "删除"] },
  { status: "已发布", color: "green", time: "2025-09-13 01:38", views: "78", acts: ["编辑", "预览", "下架", "置顶"] },
  { status: "已发布", color: "green", time: "2025-10-19 20:58", views: "54", acts: ["编辑", "预览", "下架", "置顶"] },
  { status: "已发布", color: "green", time: "2025-09-22 07:04", views: "52", acts: ["编辑", "预览", "下架", "置顶"] },
  { status: "已发布", color: "green", time: "2025-11-15 22:18", views: "22", acts: ["编辑", "预览", "下架", "置顶"] },
  { status: "已发布", color: "green", time: "2025-10-22 13:02", views: "95", acts: ["编辑", "预览", "下架", "置顶"] },
];

async function fillTable(frame) {
  const headers = [
    ["h-no", "序号"],
    ["h-title", "标题"],
    ["h-status", "状态"],
    ["h-time", "公告时间"],
    ["h-views", "阅读量"],
    ["h-act", "操作"],
  ];
  for (let i = 0; i < headers.length; i++) {
    const cell = findNamed(frame, headers[i][0], "INSTANCE");
    if (!cell) throw new Error("找不到表头 " + headers[i][0]);
    const title = findNamed(cell, "Title", "TEXT") || firstText(cell);
    await setChars(title, headers[i][1]);
  }
  log("表头已写入");

  for (let i = 0; i < ROWS.length; i++) {
    const n = i + 1;
    const row = ROWS[i];
    const no = findNamed(frame, "c-" + n + "-no", "INSTANCE");
    const title = findNamed(frame, "c-" + n + "-title", "INSTANCE");
    const status = findNamed(frame, "c-" + n + "-status", "INSTANCE");
    const time = findNamed(frame, "c-" + n + "-time", "INSTANCE");
    const views = findNamed(frame, "c-" + n + "-views", "INSTANCE");
    const act = findNamed(frame, "c-" + n + "-act", "INSTANCE");
    if (!no || !title || !status || !time || !views || !act) {
      throw new Error("找不到第 " + n + " 行单元格");
    }
    await setChars(findNamed(no, "text", "TEXT") || firstText(no), String(n));
    await setChars(findNamed(title, "text", "TEXT") || firstText(title), "标题名称");
    await setChars(findNamed(time, "text", "TEXT") || firstText(time), row.time);
    await setChars(findNamed(views, "text", "TEXT") || firstText(views), row.views);

    const tag = findNamed(status, "tag", "INSTANCE");
    if (tag) {
      try {
        tag.setProperties({ 颜色: row.color, 尺寸: "20" });
      } catch (e) {}
      await setChars(findNamed(tag, "label", "TEXT") || firstText(tag), row.status);
    }

    const a3 = findNamed(act, "Action3", "TEXT");
    const a2 = findNamed(act, "Action2", "TEXT");
    const a1 = findNamed(act, "Action1", "TEXT");
    const a0 = findNamed(act, "Action", "TEXT");
    if (a3) await setChars(a3, row.acts[0]);
    if (a2) await setChars(a2, row.acts[1]);
    if (a1) await setChars(a1, row.acts[2]);
    if (a0) await setChars(a0, row.acts[3]);
    try {
      act.setProperties({
        "Action1#6470:0": row.acts[2],
        "Action2#6470:8": row.acts[1],
        "Action3#6470:16": row.acts[0],
      });
    } catch (e) {}
  }
  log("10 行数据已写入");
}

async function fillPagination(frame) {
  const slot = findNamed(frame, "分页区", "FRAME");
  if (!slot) {
    log("未找到分页区，跳过分页");
    return;
  }
  const existing = slot.findOne(function (n) {
    return n.type === "INSTANCE" && (n.name === "Pagination" || n.name.indexOf("Pagination") === 0);
  });
  let inst = existing;
  if (!inst) {
    const set = await findPaginationSet();
    if (!set) throw new Error("找不到本地 Pagination 组件");
    const variant =
      set.children.find(function (c) {
        return c.type === "COMPONENT" && c.name.indexOf("尺寸=Default") !== -1;
      }) || set.defaultVariant;
    inst = variant.createInstance();
    inst.name = "Pagination";
    slot.appendChild(inst);
    if ("layoutSizingHorizontal" in inst) inst.layoutSizingHorizontal = "FILL";
  }
  try {
    inst.setProperties({
      "跳转#15287:3": false,
      "条数设置#15287:4": false,
      "合计#15287:5": true,
      尺寸: "Default",
    });
  } catch (e) {}
  const total = firstText(inst);
  if (total && total.characters.indexOf("共") === 0) {
    await setChars(total, "共 101 项数据");
  } else {
    const texts = [];
    walk(inst, function (n) {
      if (n.type === "TEXT" && n.characters.indexOf("共") === 0) texts.push(n);
    });
    if (texts[0]) await setChars(texts[0], "共 101 项数据");
  }
  const pageNums = ["1", "2", "3", "4", "5", "11"];
  const items = findAllNamed(inst, "Component/Items", "INSTANCE");
  let pi = 0;
  for (let i = 0; i < items.length && pi < pageNums.length; i++) {
    const props = items[i].componentProperties || {};
    const kind = props.Tpye && props.Tpye.value;
    if (kind === "Button") continue;
    try {
      items[i].setProperties({
        "Page-num#2970:0": pageNums[pi],
        State: pi === 0 ? "Selected" : "Default",
        Size: "Default",
        Tpye: "Number",
        Bg: pi === 0 ? "True" : "False",
        Border: "False",
      });
    } catch (e) {}
    const t = firstText(items[i]);
    if (t) await setChars(t, pageNums[pi]);
    pi += 1;
  }
  log("分页已放置");
}

function selfCheck(frame) {
  let instances = 0;
  const topNative = [];
  function visit(n, insideInstance) {
    if (n.type === "INSTANCE") instances += 1;
    if (!insideInstance && n !== frame && n.type !== "FRAME" && n.type !== "INSTANCE" && n.type !== "GROUP") {
      topNative.push(n.type + ":" + n.name);
    }
    if ("children" in n) {
      const next = insideInstance || n.type === "INSTANCE";
      for (let i = 0; i < n.children.length; i++) visit(n.children[i], next);
    }
  }
  visit(frame, false);
  return { instances: instances, nativeOutside: topNative };
}

async function main() {
  try {
    log("正在查找画板「门户运营端-产品公告」…");
    const frame = await findPageFrame();
    if (!frame) {
      fail("当前文件里找不到「门户运营端-产品公告」。请打开规范文件后再运行。");
      return;
    }
    await figma.setCurrentPageAsync(frame.parent.type === "PAGE" ? frame.parent : figma.currentPage);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    log("已定位画板 " + frame.id);

    const title = findNamed(frame, "page-title", "INSTANCE");
    if (title) {
      hideRequired(title);
      const t = findNamed(title, "text", "TEXT") || firstText(title);
      await setChars(t, "产品公告");
    }

    await fillTable(frame);
    await fillPagination(frame);

    const check = selfCheck(frame);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);
    done(
      "实例数 " +
        check.instances +
        (check.nativeOutside.length
          ? "\n布局容器外的原生图层：" + check.nativeOutside.join(", ")
          : "\n可见控件均为组件实例，未 Detach。")
    );
  } catch (e) {
    fail((e && e.message) || String(e));
  }
}

main();
