#!/usr/bin/env python3
import json
import sqlite3
import urllib.parse
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "carbon.db"

STANDARDS = [
    ("GHG_PROTOCOL", "GHG Protocol Scope 3 Standard", "按范围三 15 类进行披露，强调价值链边界、活动数据质量和类别完整性。", "范围三"),
    ("ISO_14064", "ISO 14064-1:2018", "按组织温室气体排放和清除量化报告要求，可将范围三映射为其他间接排放类别。", "其他间接排放"),
    ("CN_GUIDELINE", "国内企业温室气体核算指南", "按国内企业温室气体核算与报告指南口径，保留活动数据、因子来源和核算说明。", "其他间接排放"),
]

CATEGORIES = [
    ("C01", "外购商品和服务", "Purchased goods and services", "外购商品和服务", "购买的产品和服务产生的间接排放"),
    ("C02", "资本品", "Capital goods", "资本品", "购置设备、设施、固定资产产生的间接排放"),
    ("C03", "燃料和能源相关活动", "Fuel- and energy-related activities", "能源相关间接排放", "不包含在范围一/二内的能源上游排放"),
    ("C04", "上游运输和配送", "Upstream transportation and distribution", "上游运输配送", "采购前后的上游物流运输与仓储排放"),
    ("C05", "运营中产生的废弃物", "Waste generated in operations", "运营废弃物处置", "运营废弃物外部处置产生的排放"),
    ("C06", "商务旅行", "Business travel", "商务差旅", "员工公务出行产生的排放"),
    ("C07", "员工通勤", "Employee commuting", "员工通勤", "员工上下班交通产生的排放"),
    ("C08", "上游租赁资产", "Upstream leased assets", "上游租赁资产", "企业承租但未纳入范围一/二的资产排放"),
    ("C09", "下游运输和配送", "Downstream transportation and distribution", "下游运输配送", "售出产品之后的运输、配送和仓储排放"),
    ("C10", "售出产品加工", "Processing of sold products", "售出产品加工", "中间产品被客户继续加工产生的排放"),
    ("C11", "售出产品使用", "Use of sold products", "售出产品使用", "售出产品使用阶段能源或物质消耗排放"),
    ("C12", "售出产品报废处理", "End-of-life treatment of sold products", "售出产品报废处理", "售出产品废弃、回收、处置产生的排放"),
    ("C13", "下游租赁资产", "Downstream leased assets", "下游租赁资产", "出租资产且未纳入范围一/二的排放"),
    ("C14", "特许经营", "Franchises", "特许经营", "特许经营活动产生的排放"),
    ("C15", "投资", "Investments", "投资", "股权、债权、项目投融资产生的排放"),
]

SOURCES = [
    ("C01", "外购原油（上游开采及炼前储运）", "t", 0.1350), ("C01", "进口天然气（管道气及 LNG 上游开采液化）", "Nm³", 0.3620),
    ("C01", "炼化催化剂及化学助剂", "t", 3.2000), ("C01", "无缝钢管及油套管", "t", 2.0500),
    ("C02", "工程建设与设备购置", "万元", 0.6200), ("C03", "外购天然气上游开采与输送", "GJ", 12.5),
    ("C04", "原油进口海运", "t·km", 0.0045), ("C04", "原油及成品油铁路运输", "t·km", 0.0185),
    ("C05", "含油污泥及危险废物委外处置", "t", 0.4500), ("C06", "航空差旅", "人·km", 0.1550),
    ("C07", "员工通勤", "人·km", 0.1200), ("C08", "租赁油库及储罐用电", "kWh", 0.5703),
    ("C09", "成品油二次配送（公路）", "t·km", 0.0780), ("C10", "化工产品下游加工", "t", 0.4200),
    ("C11", "售出车用汽油燃烧", "t", 3.1000), ("C11", "售出车用柴油燃烧", "t", 3.1500),
    ("C11", "售出航空煤油燃烧", "t", 3.1500), ("C11", "售出天然气燃烧", "Nm³", 2.1620),
    ("C11", "售出液化石油气燃烧", "t", 3.1000), ("C12", "售出合成树脂废弃处置", "t", 0.9800),
    ("C13", "出租油库及码头用电", "kWh", 0.5703), ("C14", "特许经营加油站用电", "kWh", 0.5703),
    ("C15", "联营及合营企业（股权比例法）", "万元", 0.2100),
]

GWP = [
    ("GHG_PROTOCOL", "CO2", 1), ("GHG_PROTOCOL", "CH4", 27.9), ("GHG_PROTOCOL", "N2O", 273),
    ("ISO_14064", "CO2", 1), ("ISO_14064", "CH4", 28), ("ISO_14064", "N2O", 265),
    ("CN_GUIDELINE", "CO2", 1), ("CN_GUIDELINE", "CH4", 21), ("CN_GUIDELINE", "N2O", 310),
]

SUBSTANCES = [
    ("CO2", "二氧化碳", "CO2", "直接温室气体", "化石燃料燃烧、工业过程和运输活动的主要排放物质"),
    ("CH4", "甲烷", "CH4", "直接温室气体", "能源开采、废弃物处理和农业相关活动产生"),
    ("N2O", "氧化亚氮", "N2O", "直接温室气体", "燃烧过程、废水处理和化学品使用相关排放"),
    ("SF6", "六氟化硫", "SF6", "含氟温室气体", "电气绝缘设备泄漏相关排放"),
    ("HFCs", "氢氟碳化物", "HFCs", "含氟温室气体", "制冷剂、空调和发泡剂相关排放"),
    ("PFCs", "全氟碳化物", "PFCs", "含氟温室气体", "半导体、铝冶炼等工业过程相关排放"),
    ("NF3", "三氟化氮", "NF3", "含氟温室气体", "显示面板、半导体清洗工艺相关排放"),
]

FORMULA_EXPR = "activity_value * factor_value * gwp_value * standard_adjustment"


def connect():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = connect()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS standards (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            guide TEXT NOT NULL,
            reporting_scope TEXT NOT NULL,
            adjustment REAL NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS scope3_categories (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            ghg_name TEXT NOT NULL,
            cn_name TEXT NOT NULL,
            description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS emission_factors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_code TEXT NOT NULL REFERENCES scope3_categories(code),
            name TEXT NOT NULL,
            unit TEXT NOT NULL,
            gas TEXT NOT NULL DEFAULT 'CO2',
            factor_value REAL NOT NULL,
            source_type TEXT NOT NULL DEFAULT '公共因子库',
            region TEXT NOT NULL DEFAULT '中国',
            year INTEGER NOT NULL DEFAULT 2026,
            reference TEXT NOT NULL DEFAULT '示例因子'
        );
        CREATE TABLE IF NOT EXISTS emission_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_code TEXT NOT NULL REFERENCES scope3_categories(code),
            name TEXT NOT NULL,
            activity_unit TEXT NOT NULL,
            default_factor_id INTEGER REFERENCES emission_factors(id),
            enabled INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS gwp_library (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            standard_code TEXT NOT NULL REFERENCES standards(code),
            gas TEXT NOT NULL,
            horizon INTEGER NOT NULL DEFAULT 100,
            value REAL NOT NULL,
            reference TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS emission_substances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            gas TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            formula TEXT NOT NULL,
            substance_type TEXT NOT NULL,
            description TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS formulas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            standard_code TEXT NOT NULL REFERENCES standards(code),
            category_code TEXT NOT NULL REFERENCES scope3_categories(code),
            expression TEXT NOT NULL,
            description TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS collection_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            org TEXT NOT NULL,
            period TEXT NOT NULL,
            category_code TEXT NOT NULL REFERENCES scope3_categories(code),
            source_id INTEGER REFERENCES emission_sources(id),
            source_name TEXT NOT NULL,
            activity_value REAL NOT NULL,
            activity_unit TEXT NOT NULL,
            gas TEXT NOT NULL DEFAULT 'CO2',
            factor_id INTEGER REFERENCES emission_factors(id),
            evidence TEXT,
            note TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            standard_code TEXT NOT NULL REFERENCES standards(code),
            org TEXT NOT NULL,
            period TEXT NOT NULL,
            total_emission REAL NOT NULL,
            content_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    if conn.execute("SELECT COUNT(*) FROM standards").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO standards(code,name,guide,reporting_scope,adjustment) VALUES(?,?,?,?,?)",
            [(c, n, g, s, {"GHG_PROTOCOL": 1.0, "ISO_14064": 0.98, "CN_GUIDELINE": 1.03}[c]) for c, n, g, s in STANDARDS],
        )
    if conn.execute("SELECT COUNT(*) FROM scope3_categories").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO scope3_categories(code,name,ghg_name,cn_name,description) VALUES(?,?,?,?,?)",
            CATEGORIES,
        )
    if conn.execute("SELECT COUNT(*) FROM emission_factors").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO emission_factors(category_code,name,unit,gas,factor_value,source_type,region,year,reference) VALUES(?,?,?,?,?,?,?,?,?)",
            [(cat, name, unit, "CO2", val, "公共因子库", "中国", 2026, "初始化范围三因子库") for cat, name, unit, val in SOURCES],
        )
    if conn.execute("SELECT COUNT(*) FROM emission_sources").fetchone()[0] == 0:
        rows = []
        for cat, name, unit, _val in SOURCES:
            factor = conn.execute(
                "SELECT id FROM emission_factors WHERE category_code=? AND name=?",
                (cat, name),
            ).fetchone()
            rows.append((cat, name, unit, factor["id"]))
        conn.executemany(
            "INSERT INTO emission_sources(category_code,name,activity_unit,default_factor_id) VALUES(?,?,?,?)",
            rows,
        )
    if conn.execute("SELECT COUNT(*) FROM gwp_library").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO gwp_library(standard_code,gas,horizon,value,reference) VALUES(?,?,?,?,?)",
            [(s, gas, 100, value, "标准内置 GWP 示例值") for s, gas, value in GWP],
        )
    if conn.execute("SELECT COUNT(*) FROM emission_substances").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO emission_substances(gas,name,formula,substance_type,description) VALUES(?,?,?,?,?)",
            SUBSTANCES,
        )
    if conn.execute("SELECT COUNT(*) FROM formulas").fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO formulas(standard_code,category_code,expression,description) VALUES(?,?,?,?)",
            [
                (standard[0], category[0], FORMULA_EXPR, f"{standard[1]} / {category[1]}：活动数据 × 排放因子 × GWP × 标准口径修正")
                for standard in STANDARDS
                for category in CATEGORIES
            ],
        )
    if conn.execute("SELECT COUNT(*) FROM collection_records").fetchone()[0] == 0:
        seed_records = [
            ("德勤中国 / ESG管理部", "2026-07", "C01", "外购原油（上游开采及炼前储运）", 95000000.0, "t", "CO2", "CRUDE-IMP-2026", "进口及外购原油 9,500 万 t"),
            ("德勤中国 / ESG管理部", "2026-07", "C01", "进口天然气（管道气及 LNG 上游开采液化）", 68000000000.0, "Nm³", "CO2", "GAS-IMP-2026", "中亚管道气及进口 LNG 680 亿 m³"),
            ("德勤中国 / ESG管理部", "2026-07", "C01", "炼化催化剂及化学助剂", 420000.0, "t", "CO2", "ERP-CAT-2026", "采购台账"),
            ("德勤中国 / ESG管理部", "2026-07", "C01", "无缝钢管及油套管", 2100000.0, "t", "CO2", "ERP-PIPE-2026", "采购台账"),
            ("德勤中国 / ESG管理部", "2026-07", "C02", "工程建设与设备购置", 28000000.0, "万元", "CO2", "CAPEX-2026", "年度资本性支出 2,800 亿元"),
            ("德勤中国 / ESG管理部", "2026-07", "C03", "外购天然气上游开采与输送", 62400000.0, "GJ", "CO2", "GAS-RF-2026", "炼化企业外购天然气 16.0 亿 m³"),
            ("德勤中国 / ESG管理部", "2026-07", "C04", "原油进口海运", 780000000000.0, "t·km", "CO2", "SHIP-2026", "VLCC 进口原油 8,700 万 t × 平均 8,970 km"),
            ("德勤中国 / ESG管理部", "2026-07", "C04", "原油及成品油铁路运输", 52000000000.0, "t·km", "CO2", "RAIL-2026", "铁路运单汇总"),
            ("德勤中国 / ESG管理部", "2026-07", "C05", "含油污泥及危险废物委外处置", 680000.0, "t", "CO2", "HW-2026", "危废转移联单"),
            ("德勤中国 / ESG管理部", "2026-07", "C06", "航空差旅", 1200000000.0, "人·km", "CO2", "TRAVEL-2026", "差旅平台导入"),
            ("德勤中国 / ESG管理部", "2026-07", "C07", "员工通勤", 5200000000.0, "人·km", "CO2", "HR-COMMUTE-2026", "在岗员工 37.6 万人通勤问卷推算"),
            ("德勤中国 / ESG管理部", "2026-07", "C08", "租赁油库及储罐用电", 86000000.0, "kWh", "CO2", "LEASE-2026", "承租社会油库 18 座"),
            ("德勤中国 / ESG管理部", "2026-07", "C09", "成品油二次配送（公路）", 26000000000.0, "t·km", "CO2", "LOG-OUT-2026", "承运商配送台账"),
            ("德勤中国 / ESG管理部", "2026-07", "C10", "化工产品下游加工", 16500000.0, "t", "CO2", "SALES-CHEM-2026", "合成树脂、合成纤维原料等中间品销量"),
            ("德勤中国 / ESG管理部", "2026-07", "C11", "售出车用汽油燃烧", 62000000.0, "t", "CO2", "SALES-GSL-2026", "汽油销量 6,200 万 t"),
            ("德勤中国 / ESG管理部", "2026-07", "C11", "售出车用柴油燃烧", 64000000.0, "t", "CO2", "SALES-DSL-2026", "柴油销量 6,400 万 t"),
            ("德勤中国 / ESG管理部", "2026-07", "C11", "售出航空煤油燃烧", 16000000.0, "t", "CO2", "SALES-JET-2026", "航煤销量 1,600 万 t"),
            ("德勤中国 / ESG管理部", "2026-07", "C11", "售出天然气燃烧", 285000000000.0, "Nm³", "CO2", "SALES-NG-2026", "天然气销量 2,850 亿 m³"),
            ("德勤中国 / ESG管理部", "2026-07", "C11", "售出液化石油气燃烧", 8200000.0, "t", "CO2", "SALES-LPG-2026", "液化石油气销量 820 万 t"),
            ("德勤中国 / ESG管理部", "2026-07", "C12", "售出合成树脂废弃处置", 11000000.0, "t", "CO2", "SALES-RESIN-2026", "合成树脂销量 1,100 万 t"),
            ("德勤中国 / ESG管理部", "2026-07", "C13", "出租油库及码头用电", 120000000.0, "kWh", "CO2", "LEASE-OUT-2026", "对外出租油库 9 座、码头 3 座"),
            ("德勤中国 / ESG管理部", "2026-07", "C14", "特许经营加油站用电", 260000000.0, "kWh", "CO2", "FRANCHISE-2026", "品牌加盟加油站 1,850 座"),
            ("德勤中国 / ESG管理部", "2026-07", "C15", "联营及合营企业（股权比例法）", 52000000.0, "万元", "CO2", "INVEST-2026", "联营及合营企业按持股比例折算营收"),
        ]
        for org, period, cat, source_name, activity, unit, gas, evidence, note in seed_records:
            source = conn.execute(
                "SELECT id, default_factor_id FROM emission_sources WHERE category_code=? AND name=?",
                (cat, source_name),
            ).fetchone()
            conn.execute(
                """
                INSERT INTO collection_records(org,period,category_code,source_id,source_name,activity_value,activity_unit,gas,factor_id,evidence,note,created_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (org, period, cat, source["id"], source_name, activity, unit, gas, source["default_factor_id"], evidence, note, datetime.now().isoformat(timespec="seconds")),
            )
    conn.commit()
    conn.close()


def rows(conn, sql, params=()):
    return [dict(row) for row in conn.execute(sql, params).fetchall()]


def get_table(conn, name):
    allowed = {
        "standards", "scope3_categories", "emission_factors", "emission_sources",
        "gwp_library", "emission_substances", "formulas", "collection_records", "reports",
    }
    if name not in allowed:
        raise ValueError("unknown table")
    return rows(conn, f"SELECT * FROM {name} ORDER BY id DESC" if name not in {"standards", "scope3_categories"} else f"SELECT * FROM {name}")


def calculate(conn, standard_code, org=None, period=None):
    standard = conn.execute("SELECT * FROM standards WHERE code=?", (standard_code,)).fetchone()
    if not standard:
        raise ValueError("unknown standard")
    params = []
    where = []
    if org:
        where.append("r.org=?")
        params.append(org)
    if period:
        where.append("r.period=?")
        params.append(period)
    where_sql = "WHERE " + " AND ".join(where) if where else ""
    sql = f"""
        SELECT r.*, c.name AS category_name, f.factor_value, f.reference, g.value AS gwp_value
        FROM collection_records r
        JOIN scope3_categories c ON c.code=r.category_code
        JOIN emission_factors f ON f.id=r.factor_id
        JOIN gwp_library g ON g.standard_code=? AND g.gas=r.gas
        {where_sql}
        ORDER BY r.category_code, r.id
    """
    calc_params = [standard_code] + params
    detail = []
    category_totals = {}
    for row in conn.execute(sql, calc_params):
        emission = float(row["activity_value"]) * float(row["factor_value"]) * float(row["gwp_value"]) * float(standard["adjustment"])
        item = dict(row)
        item["standard_code"] = standard_code
        item["standard_name"] = standard["name"]
        item["standard_adjustment"] = standard["adjustment"]
        item["emission_tco2e"] = round(emission, 4)
        detail.append(item)
        category_totals[item["category_code"]] = category_totals.get(item["category_code"], 0) + emission
    total = sum(category_totals.values())
    categories = [
        {
            "category_code": code,
            "category_name": conn.execute("SELECT name FROM scope3_categories WHERE code=?", (code,)).fetchone()["name"],
            "emission_tco2e": round(value, 4),
            "share": round(value / total * 100, 2) if total else 0,
        }
        for code, value in sorted(category_totals.items())
    ]
    return {
        "standard": dict(standard),
        "total_emission": round(total, 4),
        "categories": categories,
        "detail": detail,
    }


def json_response(handler, payload, status=200):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        raw = urllib.parse.urlparse(path).path
        if raw == "/":
            raw = "/Deloitte碳排放管理系统-交互增强版.html"
        return str(ROOT / raw.lstrip("/"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            return super().do_GET()
        try:
            conn = connect()
            query = urllib.parse.parse_qs(parsed.query)
            if parsed.path == "/api/demo-state":
                conn.execute("CREATE TABLE IF NOT EXISTS demo_state (id INTEGER PRIMARY KEY, content TEXT NOT NULL)")
                saved = conn.execute("SELECT content FROM demo_state WHERE id=1").fetchone()
                payload = {"state": json.loads(saved[0]) if saved else None}
            elif parsed.path == "/api/bootstrap":
                payload = {
                    "standards": get_table(conn, "standards"),
                    "categories": get_table(conn, "scope3_categories"),
                    "sources": get_table(conn, "emission_sources"),
                    "factors": get_table(conn, "emission_factors"),
                    "gwp": get_table(conn, "gwp_library"),
                    "substances": get_table(conn, "emission_substances"),
                    "formulas": get_table(conn, "formulas"),
                    "records": get_table(conn, "collection_records"),
                    "reports": get_table(conn, "reports"),
                }
            elif parsed.path == "/api/calculate":
                payload = calculate(
                    conn,
                    query.get("standard", ["GHG_PROTOCOL"])[0],
                    query.get("org", [None])[0],
                    query.get("period", [None])[0],
                )
            elif parsed.path.startswith("/api/table/"):
                payload = {"rows": get_table(conn, parsed.path.rsplit("/", 1)[-1])}
            else:
                json_response(self, {"error": "not found"}, 404)
                return
            json_response(self, payload)
        except Exception as exc:
            json_response(self, {"error": str(exc)}, 500)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            json_response(self, {"error": "not found"}, 404)
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        try:
            conn = connect()
            if parsed.path == "/api/demo-state":
                conn.execute("CREATE TABLE IF NOT EXISTS demo_state (id INTEGER PRIMARY KEY, content TEXT NOT NULL)")
                conn.execute("INSERT INTO demo_state(id,content) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content", (json.dumps(body["state"], ensure_ascii=False),))
                conn.commit()
                payload = {"ok": True}
            elif parsed.path == "/api/records":
                source = conn.execute("SELECT * FROM emission_sources WHERE id=?", (body["source_id"],)).fetchone()
                factor_id = body.get("factor_id") or source["default_factor_id"]
                conn.execute(
                    """
                    INSERT INTO collection_records(org,period,category_code,source_id,source_name,activity_value,activity_unit,gas,factor_id,evidence,note,created_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                    """,
                    (
                        body.get("org", "德勤中国 / ESG管理部"),
                        body.get("period", "2026-07"),
                        body["category_code"],
                        body["source_id"],
                        source["name"],
                        float(body["activity_value"]),
                        body.get("activity_unit") or source["activity_unit"],
                        body.get("gas", "CO2"),
                        factor_id,
                        body.get("evidence", ""),
                        body.get("note", ""),
                        datetime.now().isoformat(timespec="seconds"),
                    ),
                )
                conn.commit()
                payload = {"ok": True, "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
            elif parsed.path == "/api/factors":
                conn.execute(
                    "INSERT INTO emission_factors(category_code,name,unit,gas,factor_value,source_type,region,year,reference) VALUES(?,?,?,?,?,?,?,?,?)",
                    (
                        body["category_code"], body["name"], body["unit"], body.get("gas", "CO2"),
                        float(body["factor_value"]), body.get("source_type", "企业私域因子库"),
                        body.get("region", "中国"), int(body.get("year", 2026)), body.get("reference", "用户新增"),
                    ),
                )
                conn.commit()
                payload = {"ok": True, "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
            elif parsed.path == "/api/sources":
                conn.execute(
                    "INSERT INTO emission_sources(category_code,name,activity_unit,default_factor_id,enabled) VALUES(?,?,?,?,1)",
                    (body["category_code"], body["name"], body["activity_unit"], int(body["default_factor_id"])),
                )
                conn.commit()
                payload = {"ok": True, "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
            elif parsed.path == "/api/gwp":
                conn.execute(
                    "INSERT INTO gwp_library(standard_code,gas,horizon,value,reference) VALUES(?,?,?,?,?)",
                    (body["standard_code"], body["gas"], int(body.get("horizon", 100)), float(body["value"]), body.get("reference", "用户新增")),
                )
                conn.commit()
                payload = {"ok": True, "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
            elif parsed.path == "/api/substances":
                conn.execute(
                    """
                    INSERT INTO emission_substances(gas,name,formula,substance_type,description)
                    VALUES(?,?,?,?,?)
                    ON CONFLICT(gas) DO UPDATE SET
                        name=excluded.name,
                        formula=excluded.formula,
                        substance_type=excluded.substance_type,
                        description=excluded.description
                    """,
                    (
                        body["gas"], body["name"], body.get("formula", body["gas"]),
                        body.get("substance_type", "直接温室气体"), body.get("description", "用户新增排放物质"),
                    ),
                )
                conn.commit()
                item = conn.execute("SELECT id FROM emission_substances WHERE gas=?", (body["gas"],)).fetchone()
                payload = {"ok": True, "id": item["id"]}
            elif parsed.path == "/api/formulas":
                conn.execute(
                    "INSERT INTO formulas(standard_code,category_code,expression,description,enabled) VALUES(?,?,?,?,1)",
                    (body["standard_code"], body["category_code"], body.get("expression", FORMULA_EXPR), body.get("description", "")),
                )
                conn.commit()
                payload = {"ok": True, "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
            elif parsed.path == "/api/reports":
                standard_code = body.get("standard_code", "GHG_PROTOCOL")
                org = body.get("org", "德勤中国 / ESG管理部")
                period = body.get("period", "2026-07")
                result = calculate(conn, standard_code, org, period)
                conn.execute(
                    "INSERT INTO reports(standard_code,org,period,total_emission,content_json,created_at) VALUES(?,?,?,?,?,?)",
                    (standard_code, org, period, result["total_emission"], json.dumps(result, ensure_ascii=False), datetime.now().isoformat(timespec="seconds")),
                )
                conn.commit()
                payload = {"ok": True, "report": result, "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
            else:
                json_response(self, {"error": "not found"}, 404)
                return
            json_response(self, payload)
        except Exception as exc:
            json_response(self, {"error": str(exc)}, 500)
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        table_map = {
            "records": "collection_records",
            "factors": "emission_factors",
            "sources": "emission_sources",
            "gwp": "gwp_library",
            "substances": "emission_substances",
            "formulas": "formulas",
            "reports": "reports",
        }
        if len(parts) != 3 or parts[0] != "api" or parts[1] not in table_map:
            json_response(self, {"error": "not found"}, 404)
            return
        try:
            conn = connect()
            conn.execute(f"DELETE FROM {table_map[parts[1]]} WHERE id=?", (int(parts[2]),))
            conn.commit()
            json_response(self, {"ok": True})
        except Exception as exc:
            json_response(self, {"error": str(exc)}, 500)
        finally:
            try:
                conn.close()
            except Exception:
                pass


def main():
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 5174), Handler)
    print(f"Serving Deloitte carbon system at http://127.0.0.1:5174/")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
