import unittest
import os
import json

from api import main as api_main
from fastapi.testclient import TestClient


class ApiLogicTests(unittest.TestCase):
    def test_filter_entries_by_year_and_sort(self):
        entries = [
            {"date": "2025-05-10", "name": "B"},
            {"date": "2024-01-01", "name": "A"},
            {"date": "2025-01-01", "name": "C"},
            {"date": None, "name": "D"},
        ]
        filtered = api_main._filter_entries_by_year(entries, 2025)
        self.assertEqual([e["name"] for e in filtered], ["C", "B"])

    def test_rank_rewatch_keys_tiebreakers(self):
        counts = {
            ("Film B", 2024): 2,
            ("Film A", 2024): 2,
            ("Film C", 2024): 1,
        }
        ratings = {
            ("Film B", 2024): 8.0,
            ("Film A", 2024): 9.0,
            ("Film C", 2024): 10.0,
        }
        ranked = api_main._rank_rewatch_keys(counts, ratings)
        self.assertEqual(ranked[0], ("Film A", 2024))
        self.assertEqual(ranked[1], ("Film B", 2024))

    def test_cold_start_score_clamped(self):
        self.assertEqual(api_main._cold_start_score(0), 7)
        self.assertEqual(api_main._cold_start_score(200), 100)

    def test_normalize_flavor_profile_returns_expected_shape(self):
        # Reset only flavor baseline state for deterministic test.
        api_main.metrics_cache["flavorBaseline"] = {"profiles": [], "histByYear": {}}
        profile = {"mainstream": 60, "modern": 70, "light": 50, "arthouse": 40, "slow": 30}
        normalized, meta = api_main._normalize_flavor_profile(2025, profile)
        self.assertTrue(all(axis in normalized for axis in api_main.FLAVOR_AXES))
        self.assertEqual(meta["normalizationMode"], "cold_start")
        self.assertIn("raw", meta)
        self.assertIn("normalized", meta)

    def test_extract_summary_hours_from_html_table(self):
        html = """
        <html><body>
            <table>
                <thead><tr><th>Films</th><th>Hours</th></tr></thead>
                <tbody><tr><td>58</td><td>121</td></tr></tbody>
            </table>
        </body></html>
        """
        hours, source = api_main._extract_summary_hours_from_html(html, year_hint=2025)
        self.assertEqual(hours, 121)
        self.assertEqual(source, "summary_table")

    def test_extract_summary_hours_from_html_label_context(self):
        html = """
        <html><body>
            <div class="metric"><span class="value">108</span><span class="label">Hours</span></div>
        </body></html>
        """
        hours, source = api_main._extract_summary_hours_from_html(html, year_hint=2025)
        self.assertEqual(hours, 108)
        self.assertEqual(source, "summary_label_context")

    def test_runtime_plausibility_rules(self):
        self.assertTrue(api_main.is_runtime_plausible(20, ["Short"]))
        self.assertFalse(api_main.is_runtime_plausible(20, ["Action"]))
        self.assertTrue(api_main.is_runtime_plausible(85, ["Documentary"]))
        self.assertFalse(api_main.is_runtime_plausible(999, ["Drama"]))

    def test_normalize_title_handles_bad_encoding(self):
        normalized = api_main.normalize_title("The Accountant� (2025)")
        self.assertNotIn("�", normalized)
        self.assertEqual(normalized, "the accountant")

    def test_safe_rating_value(self):
        self.assertEqual(api_main._safe_rating_value(None), 0.0)
        self.assertEqual(api_main._safe_rating_value(0), 0.0)
        self.assertEqual(api_main._safe_rating_value(""), 0.0)
        self.assertEqual(api_main._safe_rating_value("4"), 4.0)
        self.assertEqual(api_main._safe_rating_value(7.5), 7.5)

    def test_film_url_candidates_include_yearless_fallback(self):
        candidates = api_main._film_url_candidates(
            "the-accountant-2-2025",
            "https://boxd.it/abcd"
        )
        self.assertEqual(candidates[0], "https://boxd.it/abcd")
        self.assertIn("https://letterboxd.com/film/the-accountant-2-2025/", candidates)
        self.assertIn("https://letterboxd.com/film/the-accountant-2/", candidates)

    def test_title_query_variants_normalize_punctuation_and_articles(self):
        variants = api_main._title_query_variants("The Mission: Impossible – Fallout")
        lowered = [v.lower() for v in variants]
        self.assertIn("the mission: impossible - fallout", lowered)
        self.assertIn("mission: impossible - fallout", lowered)

    def test_choose_best_imdb_candidate_prefers_exact_normalized_title_and_year(self):
        candidates = [
            ("Mission Impossible Fallout", 2017, 147, "Action", "", ""),
            ("Mission: Impossible - Fallout", 2018, 147, "Action", "", ""),
            ("Mission: Impossible - Fallout", 2020, 147, "Action", "", ""),
        ]
        best = api_main._choose_best_imdb_candidate(candidates, 2018, "Mission: Impossible – Fallout")
        self.assertIsNotNone(best)
        self.assertEqual(best[0], "Mission: Impossible - Fallout")
        self.assertEqual(best[1], 2018)

    def test_metrics_flavor_summary_requires_admin_key(self):
        previous_admin_key = os.environ.get("ANALYTICS_ADMIN_KEY")
        os.environ["ANALYTICS_ADMIN_KEY"] = "test-admin-key"
        try:
            client = TestClient(api_main.app)
            response = client.get("/api/metrics/flavor-summary")
            self.assertEqual(response.status_code, 401)
        finally:
            if previous_admin_key is None:
                os.environ.pop("ANALYTICS_ADMIN_KEY", None)
            else:
                os.environ["ANALYTICS_ADMIN_KEY"] = previous_admin_key

    def test_metrics_flavor_summary_returns_compact_year_data(self):
        previous_admin_key = os.environ.get("ANALYTICS_ADMIN_KEY")
        baseline_snapshot = json.loads(json.dumps(api_main.metrics_cache.get("flavorBaseline", {})))
        os.environ["ANALYTICS_ADMIN_KEY"] = "test-admin-key"

        test_hist = api_main._empty_axis_hist()
        test_hist[96] = 2
        test_axes = {axis: list(test_hist) for axis in api_main.FLAVOR_AXES}

        with api_main.metrics_lock:
            api_main.metrics_cache["flavorBaseline"] = {
                "profiles": [{"year": 2025, "axes": {"mainstream": 96}}],
                "histByYear": {"2025": {"count": 2, "axes": test_axes}}
            }

        try:
            client = TestClient(api_main.app)
            response = client.get(
                "/api/metrics/flavor-summary",
                headers={"X-Admin-Key": "test-admin-key"}
            )
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["totalProfiles"], 1)
            self.assertEqual(payload["years"][0]["year"], "2025")
            self.assertEqual(payload["years"][0]["count"], 2)
            self.assertEqual(payload["years"][0]["axes"]["mainstream"]["peakScore"], 96)
        finally:
            with api_main.metrics_lock:
                api_main.metrics_cache["flavorBaseline"] = baseline_snapshot
            if previous_admin_key is None:
                os.environ.pop("ANALYTICS_ADMIN_KEY", None)
            else:
                os.environ["ANALYTICS_ADMIN_KEY"] = previous_admin_key


if __name__ == "__main__":
    unittest.main()
