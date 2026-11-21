"""Create a portable handover archive without credentials or Git internals."""
import hashlib
import shutil
import sqlite3
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "交付文件"
FILES = [
    ".gitignore", "index.html", "styles.css", "app.js", "server.py",
    "build_demo.py", "offline-demo.js", "interactive-demo.js",
    "lca-workbench.js", "scenario-data.js", "workflow-ui.js", "lifecycle-sankey.js",
    "Deloitte碳排放管理系统-交互增强版.html", "Deloitte碳排放管理系统-交互演示.html",
    "public-carbon-site/build-public.mjs", "public-carbon-site/.openai/hosting.json",
    "public-carbon-site/dist/index.html", "package_handover.py",
]


def main():
    OUTPUT.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "HANDOVER.md", OUTPUT / "项目交接说明.md")
    with tempfile.TemporaryDirectory() as temporary:
        base = Path(temporary) / "Deloitte-Carbon-Handover"
        project = base / "project"
        project.mkdir(parents=True)
        shutil.copy2(ROOT / "HANDOVER.md", base / "HANDOVER.md")
        shutil.copy2(ROOT / "HANDOVER.md", project / "HANDOVER.md")
        for name in FILES:
            destination = project / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, destination)
        shutil.copytree(ROOT / "碳系统截图", project / "碳系统截图",
                        ignore=shutil.ignore_patterns(".DS_Store"))
        database = ROOT / "data/carbon.db"
        if database.exists():
            (project / "data").mkdir(exist_ok=True)
            with sqlite3.connect(database) as source, sqlite3.connect(project / "data/carbon.db") as target:
                source.backup(target)
                assert target.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        entries = sorted(path for path in base.rglob("*") if path.is_file())
        manifest = "\n".join(
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(base).as_posix()}"
            for path in entries
        ) + "\n"
        (base / "SHA256SUMS.txt").write_text(manifest, encoding="utf-8")
        archive = OUTPUT / "Deloitte碳排放系统-完整交接包-20261119.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            for path in sorted(base.rglob("*")):
                if path.is_file():
                    bundle.write(path, path.relative_to(base.parent))
        with zipfile.ZipFile(archive) as bundle:
            assert bundle.testzip() is None
            print(f"Archive verified: {len(bundle.namelist())} files, {archive.stat().st_size} bytes")
        print(archive)


if __name__ == "__main__":
    main()
