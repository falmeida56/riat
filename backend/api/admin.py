from django.contrib import admin
from .models import GroundingReference

@admin.register(GroundingReference)
class GroundingReferenceAdmin(admin.ModelAdmin):
    list_display = (
        'source_key',
        'source_title',
        'source_type',
        'review_status',
        'active',
        'applies_to_all_dimensions',
        'updated_at',
    )
    list_filter = ('source_type', 'review_status', 'active', 'applies_to_all_dimensions', 'dimensions')
    search_fields = ('source_key', 'source_title', 'citation', 'summary', 'guidance')
    filter_horizontal = ('dimensions',)
