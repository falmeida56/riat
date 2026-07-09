from django.test import Client, SimpleTestCase, TestCase
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory, force_authenticate

from api.management.commands.import_grounding_references import parse_bool, parse_dimensions
from api.models import GroundingReference
from api.permissions import IsAdminUser
from api.serializers import GroundingReferenceSerializer
from api.views import (
    GroundingReferenceDetailView,
    GroundingReferenceListCreateView,
    _normalize_external_copilot_plan,
)


class PermissionUser:
    def __init__(self, is_authenticated, user_role):
        self.is_authenticated = is_authenticated
        self.user_role = user_role


class Request:
    def __init__(self, user):
        self.user = user


class IsAdminUserPermissionTests(SimpleTestCase):
    def test_allows_authenticated_role_one_user(self):
        permission = IsAdminUser()
        request = Request(PermissionUser(is_authenticated=True, user_role=1))

        self.assertTrue(permission.has_permission(request, None))

    def test_denies_non_admin_user(self):
        permission = IsAdminUser()
        request = Request(PermissionUser(is_authenticated=True, user_role=2))

        with self.assertRaises(PermissionDenied):
            permission.has_permission(request, None)


class HealthCheckTests(SimpleTestCase):
    def test_health_endpoint_is_public_and_non_sensitive(self):
        response = Client().get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "status": "ok",
            "service": "riat-api",
        })


class GroundingReferenceImportParserTests(SimpleTestCase):
    def test_parse_bool_accepts_expected_true_values(self):
        for value in ["1", "true", "yes", "y", "on", " TRUE "]:
            self.assertTrue(parse_bool(value))

    def test_parse_bool_uses_default_for_blank_values(self):
        self.assertTrue(parse_bool("", default=True))
        self.assertFalse(parse_bool(None, default=False))

    def test_parse_dimensions_splits_pipe_separated_values(self):
        self.assertEqual(
            parse_dimensions("Governance|Educational | 12 |"),
            ["Governance", "Educational", "12"],
        )

    def test_denies_unauthenticated_user(self):
        permission = IsAdminUser()
        request = Request(PermissionUser(is_authenticated=False, user_role=1))

        with self.assertRaises(PermissionDenied):
            permission.has_permission(request, None)


class GroundingReferenceSerializerTests(TestCase):
    def test_requires_dimension_or_all_dimensions_flag(self):
        serializer = GroundingReferenceSerializer(data={
            "source_key": "source-without-scope",
            "source_title": "Source without scope",
            "source_type": "article",
            "applies_to_all_dimensions": False,
            "dimensions": [],
            "review_status": "draft",
            "active": True,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("Assign at least one affected dimension", str(serializer.errors))

    def test_all_dimensions_flag_allows_empty_dimensions(self):
        serializer = GroundingReferenceSerializer(data={
            "source_key": "source-for-all-dimensions",
            "source_title": "Source for all dimensions",
            "source_type": "framework",
            "applies_to_all_dimensions": True,
            "dimensions": [],
            "review_status": "reviewed",
            "active": True,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_created_by_is_server_owned(self):
        serializer = GroundingReferenceSerializer(data={
            "source_key": "server-owned-created-by",
            "source_title": "Server owned created by",
            "source_type": "article",
            "applies_to_all_dimensions": True,
            "dimensions": [],
            "review_status": "reviewed",
            "active": True,
            "created_by": "spoofed@example.com",
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        reference = serializer.save(created_by="admin@example.com")

        self.assertEqual(reference.created_by, "admin@example.com")


class GroundingReferenceApiTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin_user = PermissionUser(is_authenticated=True, user_role=1)
        self.non_admin_user = PermissionUser(is_authenticated=True, user_role=2)

    def test_list_requires_admin_role(self):
        view = GroundingReferenceListCreateView.as_view()
        request = self.factory.get("/api/grounding-references/")
        force_authenticate(request, user=self.non_admin_user)

        response = view(request)

        self.assertEqual(response.status_code, 403)

    def test_delete_retires_instead_of_removing_source(self):
        reference = GroundingReference.objects.create(
            source_key="retire-source",
            source_title="Retire source",
            source_type="report",
            applies_to_all_dimensions=True,
            review_status="reviewed",
            active=True,
        )

        view = GroundingReferenceDetailView()
        view.perform_destroy(reference)
        reference.refresh_from_db()

        self.assertFalse(reference.active)
        self.assertEqual(reference.review_status, "retired")


class CopilotPlanNormalizationTests(SimpleTestCase):
    def test_normalizes_reference_sources_from_external_plan(self):
        normalized = _normalize_external_copilot_plan({
            "reference_sources": [
                {
                    "source_id": "12",
                    "source_key": "RRI-001",
                    "title": "Responsible innovation reference",
                    "dimensions": ["Governance"],
                }
            ],
        })

        self.assertEqual(normalized["generated_by"], "external_llm")
        self.assertEqual(normalized["reference_sources"], [
            {
                "source_id": "12",
                "source_key": "RRI-001",
                "title": "Responsible innovation reference",
                "dimensions": ["Governance"],
            }
        ])
