import csv

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Dimensions, GroundingReference


BOOLEAN_TRUE = {"1", "true", "yes", "y", "on"}


def parse_bool(value, default=False):
    if value is None or str(value).strip() == "":
        return default
    return str(value).strip().lower() in BOOLEAN_TRUE


def parse_dimensions(value):
    if not value:
        return []
    return [item.strip() for item in str(value).split("|") if item.strip()]


class Command(BaseCommand):
    help = "Import reviewed RIAT grounding references from a CSV file."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to a UTF-8 CSV file.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report changes without writing to the database.",
        )
        parser.add_argument(
            "--validate-csv-only",
            action="store_true",
            help=(
                "Validate required CSV fields without connecting rows to database dimensions. "
                "Useful in local check mode where legacy dimension tables are unmanaged."
            ),
        )

    def handle(self, *args, **options):
        csv_path = options["csv_path"]
        dry_run = options["dry_run"]
        validate_csv_only = options["validate_csv_only"]

        try:
            with open(csv_path, newline="", encoding="utf-8-sig") as csv_file:
                rows = list(csv.DictReader(csv_file))
        except OSError as exc:
            raise CommandError(f"Could not read CSV file: {exc}") from exc

        if not rows:
            self.stdout.write(self.style.WARNING("No rows found."))
            return

        if validate_csv_only:
            for index, row in enumerate(rows, start=2):
                source_key = (row.get("source_key") or "").strip()
                source_title = (row.get("source_title") or "").strip()
                if not source_key or not source_title:
                    raise CommandError(f"Row {index}: source_key and source_title are required.")
                applies_to_all = parse_bool(row.get("applies_to_all_dimensions"), default=False)
                dimension_tokens = parse_dimensions(row.get("dimensions"))
                if not applies_to_all and not dimension_tokens:
                    raise CommandError(
                        f"Row {index}: provide dimensions or set applies_to_all_dimensions=true."
                    )
            self.stdout.write(self.style.SUCCESS(f"Validated {len(rows)} CSV row(s)."))
            return

        created = 0
        updated = 0

        with transaction.atomic():
            for index, row in enumerate(rows, start=2):
                source_key = (row.get("source_key") or "").strip()
                source_title = (row.get("source_title") or "").strip()
                if not source_key or not source_title:
                    raise CommandError(f"Row {index}: source_key and source_title are required.")

                applies_to_all = parse_bool(row.get("applies_to_all_dimensions"), default=False)
                dimension_tokens = parse_dimensions(row.get("dimensions"))
                if not applies_to_all and not dimension_tokens:
                    raise CommandError(
                        f"Row {index}: provide dimensions or set applies_to_all_dimensions=true."
                    )

                dimensions = []
                for token in dimension_tokens:
                    lookup = {"id_dimensions": int(token)} if token.isdigit() else {"dimension_name__iexact": token}
                    try:
                        dimensions.append(Dimensions.objects.get(**lookup))
                    except Dimensions.DoesNotExist as exc:
                        raise CommandError(f"Row {index}: unknown dimension '{token}'.") from exc
                    except Dimensions.MultipleObjectsReturned as exc:
                        raise CommandError(
                            f"Row {index}: dimension '{token}' matches multiple rows; use the numeric id."
                        ) from exc

                reference, was_created = GroundingReference.objects.update_or_create(
                    source_key=source_key,
                    defaults={
                        "source_title": source_title,
                        "source_type": (row.get("source_type") or "other").strip(),
                        "citation": row.get("citation") or "",
                        "url": row.get("url") or "",
                        "summary": row.get("summary") or "",
                        "guidance": row.get("guidance") or "",
                        "evidence_examples": row.get("evidence_examples") or "",
                        "applies_to_all_dimensions": applies_to_all,
                        "review_status": (row.get("review_status") or "draft").strip(),
                        "active": parse_bool(row.get("active"), default=True),
                        "created_by": row.get("created_by") or "csv-import",
                    },
                )
                reference.dimensions.set([] if applies_to_all else dimensions)

                if was_created:
                    created += 1
                else:
                    updated += 1

            if dry_run:
                transaction.set_rollback(True)

        action = "Would create/update" if dry_run else "Created/updated"
        self.stdout.write(
            self.style.SUCCESS(f"{action} {created} new and {updated} existing grounding references.")
        )
