# -*- coding: utf-8 -*-
"""
CampusMart · init.sql 影子文件校验
======================================================================
做三件事：

  1. 【从零建库】把 sql/init.sql 里的库名换成临时库，在全新库上跑一遍
  2. 【幂等】同一份 init.sql 连跑两遍，都要成功（不许出现 Duplicate/Unknown）
  3. 【影子文件一致性】把新库的表结构与真实库逐张比对，必须完全一致

用法：
    python scripts/verify_init_sql.py

前提：MySQL 可用（D:\\MYSQL\\mysql-8.0.34-winx64，root/1234）
安全：全程只操作临时库 campusmart_scratch，跑完自动 DROP，不碰 campusmart。
"""
import re
import subprocess
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

MYSQL = r"D:/MYSQL/mysql-8.0.34-winx64/bin/mysql.exe"
REAL_DB = "campusmart"
SCRATCH_DB = "campusmart_scratch"
INIT_SQL = Path(__file__).resolve().parent.parent / "sql" / "init.sql"

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


def run_sql(sql, db=None):
    cmd = [MYSQL, "-uroot", "-p1234", "--default-character-set=utf8mb4", "-N", "-e", sql]
    if db:
        cmd.insert(1, db)
    r = subprocess.run(cmd, capture_output=True)
    return (r.returncode,
            r.stdout.decode("utf-8", errors="replace").strip(),
            r.stderr.decode("utf-8", errors="replace").strip())


def run_file(path):
    """用 mysql 客户端把整个 .sql 文件喂进去（模拟 `mysql -u root -p < init.sql`）"""
    with open(path, "rb") as f:
        r = subprocess.run(
            [MYSQL, "-uroot", "-p1234", "--default-character-set=utf8mb4"],
            stdin=f, capture_output=True,
        )
    return (r.returncode,
            r.stdout.decode("utf-8", errors="replace").strip(),
            r.stderr.decode("utf-8", errors="replace").strip())


def normalize(ddl):
    """
    把 DDL 归一化，只保留有语义的部分，便于比对：
      - 抹掉 AUTO_INCREMENT=数字（随数据变）
      - mysql -N 把换行输出成字面量 \\n，先还原
      - 列定义 / 索引定义 / 尾部（ENGINE 等）分开
      - **索引按名字排序** —— 声明顺序不影响任何行为，不算差异
    """
    ddl = re.sub(r"AUTO_INCREMENT=\d+\s*", "", ddl)
    ddl = ddl.replace("\\n", "\n")
    cols, keys, tail = [], [], []
    for line in ddl.splitlines():
        line = re.sub(r"\s+", " ", line.strip()).rstrip(",").strip()
        if not line:
            continue
        if re.match(r"^(KEY|UNIQUE KEY|PRIMARY KEY|CONSTRAINT|INDEX|FULLTEXT)\b", line):
            keys.append(line)
        elif line.startswith(")"):
            tail.append(line)
        elif line.startswith("CREATE TABLE") or line == "(":
            continue
        else:
            cols.append(line)
    return "\n".join(cols) + "\n" + "\n".join(sorted(keys)) + "\n" + "\n".join(tail)


def tables_of(db):
    code, out, err = run_sql(f"SHOW TABLES FROM {db};")
    if code != 0:
        return []
    return sorted(x for x in out.splitlines() if x.strip())


def ddl_of(db, table):
    code, out, err = run_sql(f"SHOW CREATE TABLE {db}.{table};")
    if code != 0 or "\t" not in out:
        return ""
    return normalize(out.split("\t", 1)[1])


def main():
    print("=" * 66)
    print("  init.sql 影子文件校验")
    print("=" * 66)
    print(f"  脚本：{INIT_SQL}")

    check("init.sql 存在", INIT_SQL.exists(), str(INIT_SQL))
    if not INIT_SQL.exists():
        return report()

    raw = INIT_SQL.read_text(encoding="utf-8")

    # 安全护栏：init.sql 里不该出现 ALTER（会破坏幂等）
    alter_lines = [l for l in raw.splitlines()
                   if l.strip().upper().startswith("ALTER")]
    check("init.sql 全文没有 ALTER 语句（保证幂等）", not alter_lines,
          f"发现 {len(alter_lines)} 行：{alter_lines[:2]}")

    # 准备临时库版本：把库名整体换掉
    scratch_sql = INIT_SQL.parent / "_scratch_init.sql"
    scratch_sql.write_text(
        raw.replace(REAL_DB, SCRATCH_DB), encoding="utf-8"
    )

    run_sql(f"DROP DATABASE IF EXISTS {SCRATCH_DB};")
    print(f"\n  —— 第 1 遍：在全新库 {SCRATCH_DB} 上执行 ——")
    code, out, err = run_file(scratch_sql)
    check("第 1 遍执行成功（从零建库）", code == 0, err[:300])

    scratch_tables = tables_of(SCRATCH_DB)
    print(f"  建出 {len(scratch_tables)} 张表：{scratch_tables}")
    check("建出 6 张表", len(scratch_tables) == 6, scratch_tables)

    print(f"\n  —— 第 2 遍：同一份 SQL 再跑一次 ——")
    code2, out2, err2 = run_file(scratch_sql)
    bad2 = [w for w in ("Duplicate", "Unknown", "ERROR") if w.lower() in err2.lower()]
    check("第 2 遍执行成功（幂等）", code2 == 0 and not bad2,
          f"code={code2} err={err2[:300]}")

    print(f"\n  —— 影子文件一致性：新库 vs 真库 {REAL_DB} ——")
    real_tables = tables_of(REAL_DB)
    check("表清单一致", real_tables == scratch_tables,
          f"真库={real_tables} 新库={scratch_tables}")

    for t in sorted(set(real_tables) & set(scratch_tables)):
        a, b = ddl_of(REAL_DB, t), ddl_of(SCRATCH_DB, t)
        check(f"表结构一致：{t}", a == b,
              "" if a == b else f"\n        真库: {a[:200]}\n        新库: {b[:200]}")

    # 收回临时库
    run_sql(f"DROP DATABASE IF EXISTS {SCRATCH_DB};")
    scratch_sql.unlink(missing_ok=True)
    print(f"\n  已清理临时库 {SCRATCH_DB} 与中间文件")
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
    print("  全部通过 ✅  init.sql 可以从零建库，且与真实库结构一致")


if __name__ == "__main__":
    main()
