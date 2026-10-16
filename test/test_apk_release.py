import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'scripts/publish-apk-release.py'
spec = importlib.util.spec_from_file_location('apk_release', MODULE)
apk_release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(apk_release)


class ReleaseMetadataTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.gradle = self.root / 'build.gradle'
        self.gradle.write_text("defaultConfig { versionCode 3; versionName '1.2' }")
        self.apk = self.root / 'test.apk'
        with zipfile.ZipFile(self.apk, 'w') as z:
            z.writestr('AndroidManifest.xml', b'0' * 2048)
        self.meta = self.root / 'apk-release.json'
        self.repo = 'markgwapo123/studentmate-frontend'

    def tearDown(self):
        self.tmp.cleanup()

    def test_published_metadata_contains_verified_download_url(self):
        data = apk_release.build_metadata(self.gradle, self.apk, self.meta, self.repo)
        self.assertEqual(3, data['versionCode'])
        self.assertTrue(data['apkUrl'].endswith('/v1.2/StudentMate-v1.2.apk'))
        self.assertEqual(64, len(data['sha256']))
        self.assertEqual(self.apk.stat().st_size, data['apkSizeBytes'])
        self.assertTrue(data['published'])

    def test_version_code_must_increase(self):
        self.meta.write_text(json.dumps({'published': True, 'versionCode': 3}))
        with self.assertRaises(ValueError):
            apk_release.build_metadata(self.gradle, self.apk, self.meta, self.repo)

    def test_release_repository_is_pinned(self):
        with self.assertRaises(ValueError):
            apk_release.build_metadata(self.gradle, self.apk, self.meta, 'another/project')


if __name__ == '__main__':
    unittest.main()
