# -*- coding: utf-8 -*-
"""
CampusMart · 配置一致性校验
======================================================================
比对 src/main/resources/application.yml（真实，不入库）
与 src/main/resources/application.yml.example（模板，入库）

规则：
  * **只比「键结构」**，不比「值」—— 示例里的密码 / 密钥 / 上传路径本来就是占位符
  * 真实配置里多出来的键 → 说明示例漏了，别人 clone 跑不起来 → FAIL
  * 示例里多出来的键 → 同样要核对（可能是文档性说明）→ FAIL
  * 另外确认 .gitignore 真的排除了真实配置（防止明文密码入库）

用法：
    python scripts/verify_config.py
"""
import re
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parent.parent
REAL = ROOT / "src" / "main" / "resources" / "application.yml"
EXAMPLE = ROOT / "src" / "main" / "resources" / "application.yml.example"

passed = 0
failed = []


def check(name, cond, detail=""):
    global passed
    if cond:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed.append(f"{name}  {detail}")
        print(f"  [FAIL] {name}   {detail}")


KEY_RE = re.compile(r"^(\s*)([\w.\-]+):(\s*(.*))?$")


def key_paths(path):
    """按缩进解析出所有「键路径」，如 campusmart.jwt.secret"""
    stack = []          # [(indent, key)]
    out = set()
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        m = KEY_RE.match(raw)
        if not m:
            continue
        indent, key, _, value = m.group(1), m.group(2), m.group(3), m.group(4)
        # 去掉行内注释：`datasource:      # 说明` 应当被当成「没有值的父节点」
        value = re.sub(r"(^|\s+)#.*$", "", value or "").strip()
        indent = len(indent.replace("\t", "  "))
        while stack and stack[-1][0] >= indent:
            stack.pop()
        full = ".".join([k for _, k in stack] + [key])
        if not value:                      # 只是父节点，继续往下
            stack.append((indent, key))
            continue
        out.add(full)
    return out


def main():
    print("=" * 66)
    print("  配置一致性校验：application.yml  vs  application.yml.example")
    print("=" * 66)

    check("两个配置文件都存在", REAL.exists() and EXAMPLE.exists(),
          f"real={REAL.exists()} example={EXAMPLE.exists()}")
    if not (REAL.exists() and EXAMPLE.exists()):
        return report()

    real_keys = key_paths(REAL)
    ex_keys = key_paths(EXAMPLE)
    print(f"  真实配置 {len(real_keys)} 个键；示例 {len(ex_keys)} 个键")

    only_real = sorted(real_keys - ex_keys)
    only_ex = sorted(ex_keys - real_keys)

    check("示例覆盖了真实配置里的全部键（没有漏配）", not only_real,
          f"只在真实配置里：{only_real}")
    check("示例里没有真实配置之外的多余键", not only_ex,
          f"只在示例里：{only_ex}")

    # 关键键必须都在（防止有人误删）
    for k in ("spring.datasource.url", "spring.datasource.username",
              "spring.datasource.password", "mybatis-plus.global-config.db-config.logic-delete-field",
              "campusmart.jwt.secret", "campusmart.jwt.expire", "campusmart.upload.path"):
        check(f"关键配置项存在：{k}", k in ex_keys, "示例里缺失")

    # 明文密码 / 密钥不能入库
    print("\n  —— 敏感信息 ——")
    g = subprocess.run(["git", "check-ignore", "-v", str(REAL)],
                       cwd=ROOT, capture_output=True)
    check("真实配置文件已被 .gitignore 排除",
          g.returncode == 0, "没被忽略 → 明文密码可能入库！")
    if g.returncode == 0:
        print(f"        {g.stdout.decode('utf-8', 'replace').strip()}")

    tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True)
    tracked_files = tracked.stdout.decode("utf-8", "replace").splitlines()
    check("仓库里只有 application.yml.example，没有 application.yml",
          "src/main/resources/application.yml.example" in tracked_files
          and "src/main/resources/application.yml" not in tracked_files,
          "真实配置被跟踪了")

    ex_text = EXAMPLE.read_text(encoding="utf-8")
    check("示例里没有明显的明文密码", "password: 1234" not in ex_text)

    return report()


def report():
    total = passed + len(failed)
    print("\n" + "=" * 66)
    print(f"  结果：{passed}/{total} 通过")
    print("=" * 66)
    if failed:
        print("\n失败项：")
        for f in failed:
            print("  - " + f)
        sys.exit(1)
    print("  全部通过 ✅  示例配置与真实配置结构一致，且敏感信息未入库")


if __name__ == "__main__":
    main()
