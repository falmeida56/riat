from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.utils.timezone import now
from django.db.models import Q
from .serializers import AnswerBaseSerializer, UserRegistrationSerializer, LoginSerializer, SurveySerializer, ProjectSerializer, ScaleSerializer, DimensionSerializer, StatementSerializer, SubmissionsSerializer, ReportSerializer, PasswordResetRequestSerializer, PasswordResetSerializer, OverallRecommendationSerializer, GroundingReferenceSerializer
from .models import AnswersBase, Surveys, Projects, Scales, Dimensions, Statements, UsersHasProjects, AnswersInteger, AnswersBoolean, AnswersText, Reports, Submissions, ReportsOverallScore, OverallRecommendations, GroundingReference
from rest_framework.permissions import  AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.generics import UpdateAPIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework import status
from .permissions import IsAdminUser
from rest_framework.generics import RetrieveAPIView
from collections import defaultdict
import json
import os
import re
import urllib.error
import urllib.request

User = get_user_model()


def _classify_scale_answer(scale_label):
    if not scale_label:
        return "unknown"

    normalized = str(scale_label).strip().lower()
    low_labels = {
        "strongly disagree", "disagree", "somewhat disagree",
        "never", "rarely", "ocasionally", "occasionally",
    }
    high_labels = {
        "somewhat agree", "agree", "strongly agree",
        "sometimes", "often", "very often", "always",
    }

    if normalized in low_labels:
        return "low"
    if normalized in high_labels:
        return "high"
    return "medium"


def _summarize_dimension_status(percentage):
    if percentage is None:
        return "unknown"
    if percentage < 55:
        return "fragile"
    if percentage < 75:
        return "developing"
    return "solid"


def _is_written_example_statement(statement):
    statement_name = (statement.get("name") or "").lower()
    scale_levels = statement.get("scale_levels")
    return "provide examples" in statement_name or not scale_levels


def _collect_written_evidence(statement):
    snippets = []
    ignored_values = {"examples", "example", "n/a", "na", "-"}
    for answer in statement.get("answers", []):
        answer_text = answer.get("value")
        if answer_text in (None, ""):
            continue
        if isinstance(answer_text, str):
            cleaned = answer_text.strip()
            if cleaned and cleaned.lower() not in ignored_values:
                snippets.append(cleaned[:300])
    return snippets


def _score_dimension_items(report, report_details):
    dimension_lookup = {
        dimension.get("id"): dimension
        for dimension in report_details.get("dimensions", [])
    }

    items = []
    for score in report_details.get("dimension_scores", []):
        dimension_id = score.get("dimensions_id_dimensions_id")
        dimension = dimension_lookup.get(dimension_id, {})
        statements = dimension.get("statements", [])
        max_points = 0
        representative_answers = []
        written_examples = []
        positive_claims = []
        weak_signals = []

        for statement in statements:
            try:
                scale_levels = int(statement.get("scale_levels") or 0)
            except (TypeError, ValueError):
                scale_levels = 0
            if scale_levels:
                max_points += scale_levels

            if _is_written_example_statement(statement):
                for snippet in _collect_written_evidence(statement):
                    if len(written_examples) < 3:
                        written_examples.append({
                            "statement": statement.get("name"),
                            "evidence": snippet,
                        })
                continue

            for answer in statement.get("answers", []):
                scale_label = answer.get("scale_label")
                value = scale_label or answer.get("value")
                if value in (None, ""):
                    continue

                answer_entry = {
                    "statement": statement.get("name"),
                    "answer": value,
                    "strength": _classify_scale_answer(scale_label),
                }

                if len(representative_answers) < 6:
                    representative_answers.append(answer_entry)

                if answer_entry["strength"] == "high" and len(positive_claims) < 3:
                    positive_claims.append(answer_entry)
                if answer_entry["strength"] == "low" and len(weak_signals) < 3:
                    weak_signals.append(answer_entry)

        try:
            raw_score = int(score.get("reports_score_dimension_score") or 0)
        except (TypeError, ValueError):
            raw_score = 0
        percentage = round((raw_score / max_points) * 100) if max_points else None
        status = _summarize_dimension_status(percentage)
        contradiction_note = None
        if status in {"fragile", "developing"} and positive_claims and not written_examples:
            contradiction_note = (
                "The scored answers suggest this area is still weak or only partly embedded, "
                "but there are positive claims without written evidence examples."
            )

        items.append({
            "dimension_id": dimension_id,
            "dimension_name": score.get("dimension_name"),
            "short_description": dimension.get("short_description"),
            "score": raw_score,
            "max_score": max_points,
            "percentage": percentage,
            "status": status,
            "representative_answers": representative_answers,
            "written_examples": written_examples,
            "positive_claims": positive_claims,
            "weak_signals": weak_signals,
            "contradiction_note": contradiction_note,
        })

    return items


def _build_ai_context(report, report_details, document_excerpt=""):
    overall_score = report.reports_overall_score_id_reports_overall_score
    recommendation = overall_score.overall_recommendations_id_overall_recommendations
    project = report_details.get("project", {})
    dimension_items = _score_dimension_items(report, report_details)
    grounding_references = _collect_grounding_references(dimension_items)
    ai_patterns = [
        r"\bai\b", r"\bartificial intelligence\b", r"\bmachine learning\b",
        r"\banalytics\b", r"\bcomputer vision\b", r"\bautonomous\b",
        r"\balgorithm", r"\bdata-driven\b", r"\bblockchain",
        r"\bdigital platform\b",
    ]
    project_text = " ".join([
        str(project.get("name", "")),
        str(project.get("acronym", "")),
        str(document_excerpt or ""),
    ]).lower()

    return {
        "project": project,
        "overall_score": {
            "value": overall_score.reports_overall_score_value,
            "max_value": overall_score.reports_overall_score_max_value,
            "level": recommendation.overall_recommendation_name,
            "static_recommendation": recommendation.overall_recommendations_description,
        },
        "dimension_scores": dimension_items,
        "written_evidence_summary": [
            {
                "dimension_name": item["dimension_name"],
                "written_examples": item["written_examples"],
            }
            for item in dimension_items
            if item.get("written_examples")
        ],
        "document_excerpt": document_excerpt[:6000],
        "appears_ai_or_data_intensive": any(re.search(pattern, project_text) for pattern in ai_patterns),
        "grounding_references": grounding_references,
    }


def _collect_grounding_references(dimension_items):
    dimension_ids = [
        item.get("dimension_id")
        for item in dimension_items
        if item.get("dimension_id")
    ]
    references = (
        GroundingReference.objects
        .filter(active=True, review_status__in=["reviewed", "approved"])
        .filter(Q(applies_to_all_dimensions=True) | Q(dimensions__id_dimensions__in=dimension_ids))
        .prefetch_related("dimensions")
        .distinct()
        .order_by("source_title")[:12]
    )

    return [
        {
            "source_id": reference.id_grounding_reference,
            "source_key": reference.source_key,
            "title": reference.source_title,
            "source_type": reference.get_source_type_display(),
            "review_status": reference.get_review_status_display(),
            "citation": reference.citation[:500],
            "url": reference.url,
            "summary": reference.summary[:700],
            "guidance": reference.guidance[:900],
            "evidence_examples": reference.evidence_examples[:700],
            "applies_to_all_dimensions": reference.applies_to_all_dimensions,
            "dimensions": [
                {
                    "id": dimension.id_dimensions,
                    "name": dimension.dimension_name,
                }
                for dimension in reference.dimensions.all()
            ],
        }
        for reference in references
    ]


def _build_dimension_action(item):
    dimension_name = (item.get("dimension_name") or "").lower()
    templates = {
        "anticipation": (
            "Create an anticipation improvement note.",
            "List the main technological, environmental, economic, and social impacts, then add a simple risk and mitigation review date.",
        ),
        "reflection/reflexivity": (
            "Add a reflexivity checkpoint to project governance.",
            "Schedule a short review moment where the team questions assumptions, interests, trade-offs, and whether the project is still solving the right problem.",
        ),
        "transparency": (
            "Strengthen transparency and communication evidence.",
            "Define what will be shared, with whom, and at which project moments, then keep a light record of dissemination and stakeholder visibility actions.",
        ),
        "governance": (
            "Tighten governance documentation for this area.",
            "Assign ownership, decision rules, and a place where new perspectives, risks, and follow-up actions are tracked.",
        ),
        "legal": (
            "Review legal and compliance readiness.",
            "Map the most relevant regulatory obligations, identify who checks them, and document how compliance is verified during the project.",
        ),
        "ethical": (
            "Convert ethical considerations into explicit operating practices.",
            "Document how ethical issues are surfaced, reviewed, and escalated, and keep examples of decisions or safeguards already applied.",
        ),
        "inclusion": (
            "Broaden inclusion and stakeholder evidence.",
            "Identify missing stakeholder groups, define how feedback will be gathered, and capture examples showing how that feedback changes project decisions.",
        ),
        "responsiveness": (
            "Improve the project’s responsiveness routine.",
            "Document how the team reacts to constraints, risks, or external changes, and show which decisions can be adapted quickly without losing project pace.",
        ),
    }

    action, detail = templates.get(
        dimension_name,
        (
            f"Create a short improvement note for {item.get('dimension_name')}.",
            "Define the gap, the owner, the next concrete action, and when it will be reviewed.",
        ),
    )

    return {"action": action, "detail": detail}


def _build_dimension_evidence(item):
    dimension_name = (item.get("dimension_name") or "").lower()
    evidence_templates = {
        "anticipation": "Impact/risk registers, scenario notes, and mitigation decisions tied to likely project consequences.",
        "reflection/reflexivity": "Team review notes showing assumptions, trade-offs, or motivations that were questioned and updated.",
        "transparency": "Communication records, dissemination materials, or stakeholder updates showing what was shared and when.",
        "governance": "Decision logs, governance meeting notes, and records of tracked perspectives or actions.",
        "legal": "Compliance checklists, regulatory reviews, GDPR or domain-specific legal validation records.",
        "ethical": "Ethics review notes, codes of conduct, conflict-of-interest records, or oversight body interactions.",
        "inclusion": "Stakeholder mapping, end-user feedback, or meeting records showing who was involved and what changed because of that input.",
        "responsiveness": "Risk response actions, contingency decisions, or evidence that the team adapted quickly to constraints or new information.",
    }
    return evidence_templates.get(
        dimension_name,
        f"Concrete records showing how {item.get('dimension_name')} was handled in project decisions and follow-up actions.",
    )


def _format_answer_examples(answer_entries):
    return [
        f"{entry['statement']} -> {entry['answer']}"
        for entry in answer_entries[:2]
    ]


def _fallback_copilot_plan(context):
    dimensions = [
        item for item in context["dimension_scores"]
        if item.get("percentage") is not None
    ]
    priority_dimensions = sorted(dimensions, key=lambda item: item["percentage"])[:3]
    project = context["project"]

    priority_gaps = []
    recommended_actions = []
    evidence_to_collect = []

    for item in priority_dimensions:
        why_it_matters = (
            f"This dimension is currently {item['status']} with a relative score of {item['percentage']}%, "
            "so it needs more explicit project practice and evidence."
        )

        if item.get("written_examples"):
            first_example = item["written_examples"][0]["evidence"]
            why_it_matters += f" The assessment already contains some written evidence, for example: \"{first_example}\"."
        else:
            why_it_matters += " The assessment does not yet contain written examples that show how this is handled in practice."

        if item.get("contradiction_note"):
            why_it_matters += f" {item['contradiction_note']}"

        if item.get("weak_signals"):
            example_signals = "; ".join(_format_answer_examples(item["weak_signals"]))
            why_it_matters += f" Weak signals in the answers include: {example_signals}."

        priority_gaps.append({
            "dimension": item["dimension_name"],
            "why_it_matters": why_it_matters,
        })

        action = _build_dimension_action(item)
        if item.get("written_examples"):
            action["detail"] += " Build on the written examples already provided and turn them into explicit repeatable practice."
        else:
            action["detail"] += " Add at least one concrete evidence example so the next assessment is less abstract."
        recommended_actions.append(action)
        evidence_to_collect.append(_build_dimension_evidence(item))

    evidence_to_collect.append("A short follow-up plan with owners, dates, and success indicators for the selected improvement actions.")

    responsible_ai_notes = []
    if context["appears_ai_or_data_intensive"]:
        responsible_ai_notes = [
            "Clarify where AI, analytics, automated decision-making, or data-driven components are used.",
            "Document data sources, data quality checks, human oversight, and monitoring responsibilities.",
            "Check whether transparency, bias, explainability, safety, or accountability risks need a dedicated mitigation plan.",
        ]

    return {
        "generated_by": "riat_fallback",
        "priority_gaps": priority_gaps,
        "recommended_actions": recommended_actions,
        "evidence_to_collect": evidence_to_collect,
        "proposal_or_impact_language": (
            f"{project.get('name', 'The project')} can strengthen its responsible innovation "
            "positioning by converting the weaker RIAT dimensions into named actions, owned follow-up tasks, "
            "and concrete evidence. This makes the project easier to monitor internally and easier to describe "
            "credibly in impact, governance, or reporting language."
        ),
        "reference_sources": [
            {
                "source_id": reference["source_id"],
                "source_key": reference["source_key"],
                "title": reference["title"],
                "dimensions": reference["dimensions"],
            }
            for reference in context.get("grounding_references", [])[:5]
        ],
        "responsible_ai_notes": responsible_ai_notes,
        "review_caveats": [
            "This is a deterministic RIAT draft because an external LLM response was not available.",
            "Use it as a starting point and validate the recommendations with the RIAT team.",
        ],
    }


def _first_text_value(item, keys):
    if isinstance(item, dict):
        for key in keys:
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    if isinstance(item, str) and item.strip():
        return item.strip()
    return ""


def _normalize_external_copilot_plan(plan):
    if not isinstance(plan, dict):
        return None

    normalized = {
        "generated_by": "external_llm",
        "priority_gaps": [],
        "recommended_actions": [],
        "evidence_to_collect": [],
        "proposal_or_impact_language": _first_text_value(
            plan.get("proposal_or_impact_language"),
            [],
        ) or _first_text_value(plan, ["proposal_or_impact_language", "impact_language", "reporting_language"]),
        "reference_sources": [],
        "responsible_ai_notes": [],
        "review_caveats": [],
    }

    for item in plan.get("priority_gaps") or []:
        if not item:
            continue
        dimension = _first_text_value(item, ["dimension", "name", "title"]) or "Priority gap"
        why_it_matters = _first_text_value(
            item,
            ["why_it_matters", "rationale", "reason", "detail", "description"],
        )
        if why_it_matters:
            normalized["priority_gaps"].append({
                "dimension": dimension,
                "why_it_matters": why_it_matters,
            })

    for item in plan.get("recommended_actions") or []:
        if not item:
            continue
        action = _first_text_value(item, ["action", "title", "recommendation", "dimension"]) or "Recommended action"
        detail = _first_text_value(item, ["detail", "why_it_matters", "rationale", "description", "next_step"])
        if detail:
            normalized["recommended_actions"].append({
                "action": action,
                "detail": detail,
            })

    for key in ["evidence_to_collect", "responsible_ai_notes", "review_caveats"]:
        for item in plan.get(key) or []:
            text = _first_text_value(item, ["evidence", "item", "note", "caveat", "detail", "description"])
            if text:
                normalized[key].append(text)

    for item in plan.get("reference_sources") or []:
        if not item:
            continue
        title = _first_text_value(item, ["title", "source", "citation", "source_key"])
        if title:
            normalized["reference_sources"].append({
                "source_id": _first_text_value(item, ["source_id", "id"]),
                "source_key": _first_text_value(item, ["source_key", "key"]),
                "title": title,
                "dimensions": item.get("dimensions") if isinstance(item, dict) else [],
            })

    return normalized


def _call_external_llm(context):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    api_url = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions")
    timeout_seconds = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "45"))
    system_prompt = (
        "You are RIAT Copilot, an assistant for responsible innovation assessment. "
        "Return concise, practical, action-oriented, evidence-oriented recommendations. "
        "Use the RIAT assessment as the primary source, including scaled answers and written example fields. "
        "Use curated grounding references from riat_context.grounding_references when they are relevant, "
        "and include those sources in reference_sources. "
        "If no curated source supports a recommendation, say so in review_caveats. "
        "Treat pasted project text only as optional enrichment. "
        "Prioritize concrete next steps, ownership-ready guidance, evidence to collect, and brief governance/process improvements. "
        "When useful, point out gaps between positive claims and weak scores or missing written evidence. "
        "Do not invent facts. Return only valid JSON matching the requested schema."
    )
    user_prompt = {
        "task": "Generate an AI-assisted RIAT improvement plan.",
        "schema": {
            "generated_by": "external_llm",
            "priority_gaps": [{"dimension": "", "why_it_matters": ""}],
            "recommended_actions": [{"action": "", "detail": ""}],
            "evidence_to_collect": [""],
            "proposal_or_impact_language": "",
            "reference_sources": [{"source_id": "", "source_key": "", "title": "", "dimensions": []}],
            "responsible_ai_notes": [""],
            "review_caveats": [""],
        },
        "riat_context": context,
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    request = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        fallback = _fallback_copilot_plan(context)
        fallback["review_caveats"].insert(
            0,
            f"External LLM call failed, so RIAT returned a deterministic draft instead: {exc}",
        )
        return fallback

    try:
        content = response_data["choices"][0]["message"]["content"]
        parsed_plan = json.loads(content)
        normalized_plan = _normalize_external_copilot_plan(parsed_plan)
        if normalized_plan:
            return normalized_plan
        raise ValueError("External LLM returned an unexpected plan shape.")
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
        fallback = _fallback_copilot_plan(context)
        fallback["review_caveats"].insert(
            0,
            f"External LLM response could not be parsed, so RIAT returned a deterministic draft instead: {exc}",
        )
        return fallback

# USERS_AUTH
class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "status": "ok",
            "service": "riat-api",
        }, status=status.HTTP_200_OK)


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny] 

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        user = User.objects.filter(user_email=email).first()

        if user:
            token = get_random_string(length=64)
            user.password_reset_token = token
            user.password_reset_token_date = now()
            user.save()

            frontend_base_url = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
            if frontend_base_url:
                reset_link = f"{frontend_base_url}/resetpassword/{token}"
            else:
                reset_link = f"{request.scheme}://{request.get_host()}/resetpassword/{token}"

            send_mail(
                'Password Reset',
                f'Click the following link to reset your password: {reset_link}',
                settings.DEFAULT_FROM_EMAIL,
                [user.user_email],
            )

        return Response({"message": ""}, status=status.HTTP_200_OK)
    
class PasswordResetView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        new_password = serializer.validated_data['new_password']

        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_token_date = None
        user.save()

        return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)


# PROJECTS

class AdminAllProjectsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = ProjectSerializer

    def get(self, request, *args, **kwargs):
        projects_queryset = Projects.objects.all()
        return self._build_response_from_projects(projects_queryset)

    def _build_response_from_projects(self, projects_queryset):
        projects_data = []

        for project in projects_queryset:
            project_data = ProjectSerializer(project).data
            project_data['submissions'] = []

            user_projects = UsersHasProjects.objects.filter(projects_id_projects=project.id_projects)

            for user_project in user_projects:
                submissions = Submissions.objects.filter(users_has_projects_id_users_has_projects=user_project.id_users_has_projects)
                for submission in submissions:
                    submission_data = {
                        "id_submissions": submission.id_submissions,
                        "submission_state": submission.submission_state,
                        "reports_overall_score_value": None,
                        "reports_overall_score_max_value": None,
                        "report_token": None,
                        "submission_starting_time": submission.submission_starting_time,
                        "submission_ending_time": submission.submission_ending_time,
                    }
                    report = Reports.objects.filter(submissions_id_submissions=submission.id_submissions).first()
                    if report:
                        submission_data["report_token"] = report.report_token
                        overall_score = report.reports_overall_score_id_reports_overall_score
                        if overall_score:
                            submission_data["reports_overall_score_value"] = overall_score.reports_overall_score_value
                            submission_data["reports_overall_score_max_value"] = overall_score.reports_overall_score_max_value
                    project_data['submissions'].append(submission_data)

            projects_data.append(project_data)

        return Response(projects_data, status=status.HTTP_200_OK)
    
class UserOwnProjectsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer

    def get(self, request, users_id_users, *args, **kwargs):
        
        if request.user.id != users_id_users and not request.user.is_staff:
            return Response({"detail": "Não autorizado."}, status=status.HTTP_403_FORBIDDEN)
        
        user_projects = UsersHasProjects.objects.filter(users_id_users=users_id_users)
        project_ids = user_projects.values_list('projects_id_projects', flat=True)
        projects_queryset = Projects.objects.filter(id_projects__in=project_ids)
        return self._build_response_from_projects(projects_queryset, user_projects)

    def _build_response_from_projects(self, projects_queryset, user_projects):
        projects_data = []

        """ for project in projects_queryset:
            project_data = ProjectSerializer(project).data
            project_data['submissions'] = []

            user_project = user_projects.filter(projects_id_projects=project.id_projects).first()
            if not user_project:
                continue

            submissions = user_project.submissions_set.all()
            total_valid_submissions = submissions.filter(submission_state=2).count()

            # Get the latest submission with state=1
            last_submission_pending = submissions.filter(submission_state=1).order_by('-id_submissions').first()
            if last_submission_pending:
                submission_data = {
                    "id_submissions": last_submission_pending.id_submissions,
                    "submission_state": last_submission_pending.submission_state,
                    "reports_overall_score_value": None,
                    "reports_overall_score_max_value": None,
                    "report_token": None,
                    "total_submissions": total_valid_submissions
                }
                report = Reports.objects.filter(submissions_id_submissions=last_submission_pending.id_submissions).first()
                if report:
                    submission_data["report_token"] = report.report_token
                    overall_score = report.reports_overall_score_id_reports_overall_score
                    if overall_score:
                        submission_data["reports_overall_score_value"] = overall_score.reports_overall_score_value
                        submission_data["reports_overall_score_max_value"] = overall_score.reports_overall_score_max_value
                project_data['submissions'].append(submission_data)

            # Get the latest submission with state=2
            last_submission_completed = submissions.filter(submission_state=2).order_by('-id_submissions').first()
            if last_submission_completed:
                submission_data = {
                    "id_submissions": last_submission_completed.id_submissions,
                    "submission_state": last_submission_completed.submission_state,
                    "reports_overall_score_value": None,
                    "reports_overall_score_max_value": None,
                    "report_token": None,
                    "total_submissions": total_valid_submissions
                }
                report = Reports.objects.filter(submissions_id_submissions=last_submission_completed.id_submissions).first()
                if report:
                    submission_data["report_token"] = report.report_token
                    overall_score = report.reports_overall_score_id_reports_overall_score
                    if overall_score:
                        submission_data["reports_overall_score_value"] = overall_score.reports_overall_score_value
                        submission_data["reports_overall_score_max_value"] = overall_score.reports_overall_score_max_value
                project_data['submissions'].append(submission_data)

            projects_data.append(project_data)

        return Response(projects_data, status=status.HTTP_200_OK) """
        
        for project in projects_queryset:
            project_data = ProjectSerializer(project).data
            project_data['submissions'] = []

            user_project = user_projects.filter(projects_id_projects=project.id_projects).first()
            if not user_project:
                continue

            submissions = user_project.submissions_set.all()
            for submission in submissions:

                submission_data = {
                    "id_submissions": submission.id_submissions,
                    "submission_state": submission.submission_state,
                    "reports_overall_score_value": None,
                    "reports_overall_score_max_value": None,
                    "report_token": None,
                    "submission_ending_time": submission.submission_ending_time,
                }
                report = Reports.objects.filter(submissions_id_submissions=submission.id_submissions).first()
                if report:
                    submission_data["report_token"] = report.report_token
                    overall_score = report.reports_overall_score_id_reports_overall_score
                    if overall_score:
                        submission_data["reports_overall_score_value"] = overall_score.reports_overall_score_value
                        submission_data["reports_overall_score_max_value"] = overall_score.reports_overall_score_max_value
                project_data['submissions'].append(submission_data)

            projects_data.append(project_data)

        return Response(projects_data, status=status.HTTP_200_OK)

class CreateProjectView(generics.CreateAPIView):
    
    permission_classes = [IsAuthenticated] 
    
    serializer_class = ProjectSerializer  
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)
    

class UpdateProjectPhaseView(UpdateAPIView):
    queryset = Projects.objects.all()
    serializer_class = ProjectSerializer
    lookup_field = 'id_projects'

    def patch(self, request, *args, **kwargs):
        project = self.get_object()
        project.project_phase = request.data.get('project_phase', project.project_phase)
        project.save()
        return Response({"message": "Project phase updated"}, status=status.HTTP_200_OK)
    
    
class AddUserToProjectView(APIView):
        permission_classes = [IsAuthenticated]

        def post(self, request, *args, **kwargs):
            project_unique_code = request.data.get('project_unique_code')
            user_id = request.data.get('user_id')
            user_role = request.data.get('user_has_projects_role')
            user_function = request.data.get('user_has_projects_function')

            if not all([project_unique_code, user_id, user_role, user_function]):
                return Response(
                    {"error": "project_unique_code, users_id_users, user_has_projects_role, and users_has_projects_function are required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                project = Projects.objects.get(project_unique_code=project_unique_code)
            except Projects.DoesNotExist:
                return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

            if UsersHasProjects.objects.filter(users_id_users=user, projects_id_projects=project).exists():
                return Response({"error": "User already assigned to this project."}, status=status.HTTP_400_BAD_REQUEST)

            user_project = UsersHasProjects.objects.create(
                users_id_users=user,
                projects_id_projects=project,
                users_has_projects_role=user_role,
                users_has_projects_function=user_function,
                users_has_projects_state = 1
            )
            
            return Response(
                {
                    "id_users_has_projects": user_project.id_users_has_projects,
                    "users_id_users": user_project.users_id_users.id,
                    "projects_id_projects": user_project.projects_id_projects.id_projects,
                    "user_has_projects_role": user_project.users_has_projects_role,
                    "users_has_projects_function": user_project.users_has_projects_function
                },
                
                status=status.HTTP_201_CREATED
            )
            
class PendingRequestsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = ProjectSerializer

    def get(self, request, *args, **kwargs):
        # Get all UsersHasProjects with state=1 (pending requests)
        pending_links = UsersHasProjects.objects.filter(users_has_projects_state=1)
        project_ids = pending_links.values_list('projects_id_projects', flat=True).distinct()
        projects = Projects.objects.filter(id_projects__in=project_ids)

        result = []
        for project in projects:
            # Find the pending request row for this project
            request_link = pending_links.filter(projects_id_projects=project.id_projects).first()
            request_user_info = None
            request_id_users_has_projects = None
            if request_link:
                request_user = request_link.users_id_users
                request_user_info = {
                    "id": request_user.id,
                    "name": getattr(request_user, "user_name", ""),
                    "email": getattr(request_user, "user_email", ""),
                    "role": request_link.users_has_projects_role,
                    "function": request_link.users_has_projects_function,
                }
                request_id_users_has_projects = request_link.id_users_has_projects

            # Find the first entry for this project (the owner)
            owner_link = UsersHasProjects.objects.filter(
                projects_id_projects=project.id_projects
            ).order_by('id_users_has_projects').first()
            owner_info = None
            if owner_link:
                owner = owner_link.users_id_users
                owner_info = {
                    "id": owner.id,
                    "name": getattr(owner, "user_name", ""),
                    "email": getattr(owner, "user_email", ""),
                    "role": owner_link.users_has_projects_role,
                    "function": owner_link.users_has_projects_function,
                }

            result.append({
                "id_projects": project.id_projects,
                "project_name": project.project_name,
                "request_user": request_user_info,
                "id_users_has_projects": request_id_users_has_projects,
                "owner": owner_info
            })
            
        return Response(result, status=status.HTTP_200_OK)

class AcceptOrRefusePendingRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, id_users_has_projects, *args, **kwargs):
        if not id_users_has_projects:
            return Response({"error": "id_users_has_projects is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_project = UsersHasProjects.objects.get(id_users_has_projects=id_users_has_projects, users_has_projects_state=1)
        except UsersHasProjects.DoesNotExist:
            return Response({"error": "Pending request not found."}, status=status.HTTP_404_NOT_FOUND)

        user_project.users_has_projects_state = 0
        user_project.save()
        return Response({"message": "Request accepted."}, status=status.HTTP_200_OK)

    def delete(self, request, id_users_has_projects, *args, **kwargs):
        if not id_users_has_projects:
            return Response({"error": "id_users_has_projects is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_project = UsersHasProjects.objects.get(id_users_has_projects=id_users_has_projects, users_has_projects_state=1)
        except UsersHasProjects.DoesNotExist:
            return Response({"error": "Pending request not found."}, status=status.HTTP_404_NOT_FOUND)

        user_project.delete()
        return Response({"message": "Request refused and deleted."}, status=status.HTTP_204_NO_CONTENT)


# SURVEYS

class GetSurveyView(generics.ListAPIView):
    
    permission_classes = [IsAuthenticated]
    
    serializer_class = SurveySerializer
    
    def get(self, request):
        surveys = Surveys.objects.all()
        serializer = SurveySerializer(surveys, many=True)
        return Response(serializer.data)

class GetSurveyDetailView(generics.ListAPIView):
    
    serializer_class = SurveySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        id_surveys = self.kwargs.get("id_surveys")
        return Surveys.objects.filter(id_surveys=id_surveys)

class CreateSurveyView(generics.CreateAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser] 
    
    serializer_class = SurveySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        survey = serializer.save()

        return Response(SurveySerializer(survey).data, status=status.HTTP_201_CREATED)
    
class UpdateSurveyView(UpdateAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = SurveySerializer
    
    queryset = Surveys.objects.all()
    lookup_field = 'id_surveys'

    def update(self, request, *args, **kwargs):
        survey = self.get_object()
        serializer = self.get_serializer(survey, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Survey updated successfully"}, status=status.HTTP_200_OK)
    
# DIMENSIONS

class GetDimensionView(generics.ListAPIView):
    
    serializer_class = DimensionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        surveys_id_surveys = self.kwargs.get("surveys_id_surveys")
        return Dimensions.objects.filter(surveys_id_surveys=surveys_id_surveys)

class CreateDimensionView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DimensionSerializer

    def create(self, request, *args, **kwargs):
        surveys_id_surveys = kwargs.get('surveys_id_surveys')  # Get from URL
        if not surveys_id_surveys:
            return Response({"error": "surveys_id_surveys is required"}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()  # Copy request data
        data['surveys_id_surveys'] = surveys_id_surveys  # Add surveys_id_surveys to data
        
        serializer = self.get_serializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        dimension = serializer.save()  # No need to pass surveys_id_surveys manually

        return Response(DimensionSerializer(dimension).data, status=status.HTTP_201_CREATED)
    
class DeleteDimensionView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DimensionSerializer
    queryset = Dimensions.objects.all()
    lookup_field = 'id_dimensions'

    def delete(self, request, *args, **kwargs):
        dimension = self.get_object()
        dimension.delete()
        return Response({"message": "Dimension deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class UpdateDimensionView(UpdateAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DimensionSerializer
    
    queryset = Dimensions.objects.all()
    lookup_field = 'id_dimensions'
    
    def update(self, request, *args, **kwargs):
        dimension = self.get_object()
        serializer = self.get_serializer(dimension, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Dimension updated successfully"}, status=status.HTTP_200_OK)
    
#STATEMENTS

class GetStatementView(generics.ListAPIView):
    
    serializer_class = StatementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        dimensions_id_dimensions = self.kwargs.get("dimensions_id_dimensions")
        return Statements.objects.filter(dimensions_id_dimensions=dimensions_id_dimensions)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        statements = []
        for statement in queryset:
            statement_data = StatementSerializer(statement).data
            if statement.scales_id_scales:
                scale_data = ScaleSerializer(statement.scales_id_scales).data
                statement_data['scale'] = scale_data
            else:
                statement_data['scale'] = None
            statements.append(statement_data)
        return Response(statements, status=status.HTTP_200_OK)

class CreateStatementView(generics.CreateAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser] 
    
    serializer_class = StatementSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        statement = serializer.save()

        return Response(StatementSerializer(statement).data, status=status.HTTP_201_CREATED)
    
class UpdateStatementView(UpdateAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = StatementSerializer
    
    queryset = Statements.objects.all()
    lookup_field = 'id_statements'
    
    def update(self, request, *args, **kwargs):
        statement = self.get_object()
        serializer = self.get_serializer(statement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Dimension updated successfully"}, status=status.HTTP_200_OK)


class DeleteStatementView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = StatementSerializer
    queryset = Statements.objects.all()
    lookup_field = 'id_statements'

    def delete(self, request, *args, **kwargs):
        statement = self.get_object()
        statement.delete()
        return Response({"message": "Statement deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
    
    
# SCALES

class GetScaleView(generics.ListAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    serializer_class = ScaleSerializer
    
    def get(self, request):
        surveys = Scales.objects.all()
        serializer = ScaleSerializer(surveys, many=True)
        return Response(serializer.data)
    
class GetSingleScaleView(generics.ListAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    serializer_class = ScaleSerializer
    
    def get_queryset(self):
        id_scales = self.kwargs.get("id_scales")
        return Scales.objects.filter(id_scales=id_scales)


class CreateScaleView(generics.CreateAPIView):
    
    permission_classes = [IsAuthenticated, IsAdminUser] 
    
    serializer_class = ScaleSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        survey = serializer.save()

        return Response(ScaleSerializer(survey).data, status=status.HTTP_201_CREATED)
    

class UpdateScaleView(UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = ScaleSerializer
    queryset = Scales.objects.all()
    lookup_field = 'id_scales'

    def update(self, request, *args, **kwargs):
        scale = self.get_object()
        serializer = self.get_serializer(scale, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Scale updated successfully"}, status=status.HTTP_200_OK)


# SUBMISSIONS

class SubmissionViewSet(viewsets.ModelViewSet):
        
        serializer_class = SubmissionsSerializer
        permission_classes = [IsAuthenticated]
    
        def get_queryset(self):
            id_submissions = self.kwargs.get("id_submissions")
            return Surveys.objects.filter(id_submissions=id_submissions)
    
        def list(self, request, *args, **kwargs):
            queryset = self.get_queryset()
            submissions = []
            for submission in queryset:
                submission_data = SurveySerializer(submission).data
                submissions.append(submission_data)
            return Response(submissions, status=status.HTTP_200_OK)  
        
        def create(self, request, *args, **kwargs):
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            submission = serializer.save()
            return Response(self.get_serializer(submission).data, status=status.HTTP_201_CREATED)

        def retrieve(self, request, id_submissions, *args, **kwargs):
            try:
                submission = Submissions.objects.get(id_submissions=id_submissions)
                serializer = self.get_serializer(submission)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Submissions.DoesNotExist:
                return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)

        def update(self, request, id_submissions, *args, **kwargs):
            try:
                submission = Submissions.objects.get(id_submissions=id_submissions)
                serializer = self.get_serializer(submission, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                updated_submission = serializer.save()
                return Response(self.get_serializer(updated_submission).data, status=status.HTTP_200_OK)
            except Submissions.DoesNotExist:
                return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)

        def destroy(self, request, id_submissions, *args, **kwargs):
            try:
                submission = Submissions.objects.get(id_submissions=id_submissions)
                submission.delete()
                return Response({"message": "Submission deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
            except Submissions.DoesNotExist:
                return Response({"error": "Submission not found"}, status=status.HTTP_404_NOT_FOUND)
        
    
# ANSWERS

class AnswerViewSet(viewsets.ModelViewSet):
    serializer_class = AnswerBaseSerializer
    permission_classes = [IsAuthenticated]
    queryset = AnswersBase.objects.all()

    def get_queryset(self):
        queryset = AnswersBase.objects.all()
        submission_id = self.request.query_params.get('submissions_id_submissions')
        statement_id = self.request.query_params.get('statements_id_statements')

        if submission_id:
            queryset = queryset.filter(submissions_id_submissions=submission_id)
        if statement_id:
            queryset = queryset.filter(statements_id_statements=statement_id)

        return queryset

    def create(self, request, *args, **kwargs):
        submission_id = request.data.get('submissions_id_submissions')
        statement_id = request.data.get('statements_id_statements')

        if not submission_id or not statement_id:
            return Response(
                {"error": "Both submissions_id_submissions and statements_id_statements are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if AnswersBase.objects.filter(
            submissions_id_submissions=submission_id,
            statements_id_statements=statement_id
        ).exists():
            return Response(
                {"error": "Answer already exists for this submission and statement"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        answer = serializer.save()

        return Response(self.get_serializer(answer).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['delete'], url_path=r'(?P<submissions_id_submissions>\d+)/(?P<statements_id_statements>\d+)', url_name='delete_by_composite')
    
    def delete_by_composite(self, request, submissions_id_submissions, statements_id_statements):
        answer = get_object_or_404(
            AnswersBase,
            submissions_id_submissions=submissions_id_submissions,
            statements_id_statements=statements_id_statements
        )
        
        # Delete related entries in AnswersInteger, AnswersBoolean, and AnswersText
        AnswersInteger.objects.filter(answers_base_id_answers_base=answer).delete()
        AnswersBoolean.objects.filter(answers_base_id_answers_base=answer).delete()
        AnswersText.objects.filter(answers_base_id_answers_base=answer).delete()
        
        # Delete the main answer entry
        answer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_object_by_composite_key(self, submission_id, statement_id):
        return get_object_or_404(
            AnswersBase,
            submissions_id_submissions=submission_id,
            statements_id_statements=statement_id
        )

    @action(detail=False, methods=['get'], url_path=r'(?P<submissions_id_submissions>\d+)/(?P<statements_id_statements>\d+)', url_name='retrieve_by_composite')
    
    def retrieve_by_composite(self, request, submissions_id_submissions, statements_id_statements, *args, **kwargs):
        instance = self.get_object_by_composite_key(submissions_id_submissions, statements_id_statements)
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Try to get the value from AnswersInteger, AnswersBoolean, or AnswersText
        value = None
        try:
            value = AnswersInteger.objects.get(answers_base_id_answers_base=instance).value
        except AnswersInteger.DoesNotExist:
            try:
                value = AnswersBoolean.objects.get(answers_base_id_answers_base=instance).value
            except AnswersBoolean.DoesNotExist:
                try:
                    value = AnswersText.objects.get(answers_base_id_answers_base=instance).value
                except AnswersText.DoesNotExist:
                    value = None

        data['value'] = value
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['put', 'patch'], url_path=r'(?P<submissions_id_submissions>\d+)/(?P<statements_id_statements>\d+)', url_name='update_by_composite')
    
    def update_by_composite(self, request, submissions_id_submissions, statements_id_statements, *args, **kwargs):
        instance = self.get_object_by_composite_key(submissions_id_submissions, statements_id_statements)
        partial = request.method == 'PATCH'
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated_answer = serializer.save()
        return Response(self.get_serializer(updated_answer).data, status=status.HTTP_200_OK)
    
    def get(self, request, submissions_id_submissions):
        answers_base = AnswersBase.objects.filter(submissions_id_submissions=submissions_id_submissions)
        result = []

        for answer in answers_base:
            statement = answer.statements_id_statements
            dimension_id = None
            if hasattr(statement, 'dimensions_id_dimensions'):
                dimension_order = getattr(statement.dimensions_id_dimensions, 'dimension_order', None)

            answer_data = {
                'id_answers_base': answer.id_answers_base,
                'statements_id_statements': statement.id_statements,
                'submissions_id_submissions': answer.submissions_id_submissions.id_submissions,
                'answer_creation_time': answer.answer_creation_time,
                'value': None,
                'dimension_order': dimension_order
            }

            try:
                answer_data['value'] = AnswersInteger.objects.get(answers_base_id_answers_base=answer).value
            except AnswersInteger.DoesNotExist:
                try:
                    answer_data['value'] = AnswersBoolean.objects.get(answers_base_id_answers_base=answer).value
                except AnswersBoolean.DoesNotExist:
                    try:
                        answer_data['value'] = AnswersText.objects.get(answers_base_id_answers_base=answer).value
                    except AnswersText.DoesNotExist:
                        pass

            result.append(answer_data)

        return Response(result, status=status.HTTP_200_OK)


# REPORTS

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Reports.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        submissions_id_submissions = request.data.get('submissions_id_submissions')
        final_score = request.data.get('final_score')
        survey_id = request.data.get('surveys_id_surveys') 
        ponderated_score = request.data.get('ponderated_score')

        if submissions_id_submissions is None:
            return Response({"error": "missing submission."}, status=status.HTTP_400_BAD_REQUEST)
        if final_score is None:
            return Response({"error": "missing final score."}, status=status.HTTP_400_BAD_REQUEST)
        if survey_id is None:
            return Response({"error": "missing survey."}, status=status.HTTP_400_BAD_REQUEST)
        if ponderated_score is None:
            return Response({"error": "missing ponderated score."}, status=status.HTTP_400_BAD_REQUEST)

        request.data['final_score'] = final_score
        request.data['surveys_id_surveys'] = survey_id
        request.data['ponderated_score'] = ponderated_score

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(self.get_serializer(report).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, report_token, *args, **kwargs):
        try:
            report = Reports.objects.get(report_token=report_token)
            serializer = self.get_serializer(report)
            data = serializer.data
            data['details'] = serializer.get_report_details(report)
            return Response(data, status=status.HTTP_200_OK)
        except Reports.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)


class ReportCopilotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, report_token):
        document_excerpt = request.data.get("document_excerpt", "")
        if document_excerpt is None:
            document_excerpt = ""
        if not isinstance(document_excerpt, str):
            return Response(
                {"error": "Document excerpt must be text."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if document_excerpt and len(document_excerpt) > 12000:
            return Response(
                {"error": "Document excerpt is too long for this prototype. Please keep it under 12,000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = Reports.objects.get(report_token=report_token)
        except Reports.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReportSerializer(report)
        report_details = serializer.get_report_details(report)
        context = _build_ai_context(report, report_details, document_excerpt=document_excerpt)
        plan = _call_external_llm(context) or _fallback_copilot_plan(context)

        return Response(
            {
                "plan": plan,
                "source_context": {
                    "project": context["project"],
                    "overall_score": context["overall_score"],
                    "appears_ai_or_data_intensive": context["appears_ai_or_data_intensive"],
                    "grounding_references": context["grounding_references"],
                },
            },
            status=status.HTTP_200_OK,
        )


# RECOMMENDATIONS


class GetOverallRecommendationsView(generics.ListAPIView):
    serializer_class = OverallRecommendationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OverallRecommendations.objects.select_related('surveys_id_surveys').all()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        grouped = defaultdict(list)
        for recommendation in queryset:
            data = OverallRecommendationSerializer(recommendation).data
            survey = getattr(recommendation, 'surveys_id_surveys', None)
            survey_name = survey.survey_name if survey else None
            data['id_surveys'] = survey.id_surveys if survey else None
            data['survey_name'] = survey_name
            grouped[survey_name].append(data)
        # Convert to list of dicts for easier frontend consumption
        result = [
            {"survey_name": survey_name, "recommendations": recs}
            for survey_name, recs in grouped.items()
        ]
        return Response(result, status=status.HTTP_200_OK)

class UpdateOverallRecommendationsView(UpdateAPIView):
    queryset = OverallRecommendations.objects.all()
    serializer_class = OverallRecommendationSerializer
    lookup_field = 'id_overall_recommendations'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        overall_recommendations_description = request.data.get('overall_recommendations_description')
        if overall_recommendations_description is not None:
            instance.overall_recommendations_description = overall_recommendations_description
            instance.save()
            return Response({"message": "Overall recommendations updated successfully"}, status=status.HTTP_200_OK)
        return Response({"error": "overall_recommendations_description is required"}, status=status.HTTP_400_BAD_REQUEST)


# GROUNDING REFERENCES


class GroundingReferenceListCreateView(generics.ListCreateAPIView):
    serializer_class = GroundingReferenceSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = GroundingReference.objects.prefetch_related('dimensions').all()
        dimension_id = self.request.query_params.get('dimension_id')
        active = self.request.query_params.get('active')
        review_status = self.request.query_params.get('review_status')

        if dimension_id:
            queryset = queryset.filter(
                Q(applies_to_all_dimensions=True) |
                Q(dimensions__id_dimensions=dimension_id)
            )
        if active in {'true', 'false'}:
            queryset = queryset.filter(active=active == 'true')
        if review_status:
            queryset = queryset.filter(review_status=review_status)

        return queryset.distinct().order_by('source_title')

    def perform_create(self, serializer):
        serializer.save(created_by=getattr(self.request.user, 'user_email', ''))


class GroundingReferenceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = GroundingReference.objects.prefetch_related('dimensions').all()
    serializer_class = GroundingReferenceSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'id_grounding_reference'

    def perform_destroy(self, instance):
        instance.active = False
        instance.review_status = 'retired'
        instance.save(update_fields=['active', 'review_status', 'updated_at'])
