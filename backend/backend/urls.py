from django.contrib import admin
from django.urls import path, include
from api.views import AddUserToProjectView, RegisterView, LoginView, GetSurveyView, GetSurveyDetailView, CreateSurveyView, UpdateSurveyView, GetScaleView, CreateScaleView, GetStatementView, CreateStatementView, CreateProjectView, UpdateProjectPhaseView, GetDimensionView, CreateDimensionView, UpdateDimensionView, UpdateStatementView, AdminAllProjectsView, UserOwnProjectsView, SubmissionViewSet, AnswerViewSet, ReportViewSet, ReportCopilotView, PasswordResetRequestView, PasswordResetView, GetSingleScaleView, UpdateScaleView, PendingRequestsView, AcceptOrRefusePendingRequestView, DeleteDimensionView, DeleteStatementView, UpdateOverallRecommendationsView, GetOverallRecommendationsView, GroundingReferenceListCreateView, GroundingReferenceDetailView, HealthCheckView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView  

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', HealthCheckView.as_view(), name='health-check'),
    #USERS_AUTH
    path('api/user/register/', RegisterView.as_view(), name='register'),
    path('api/user/login/', LoginView.as_view(), name='login'),
    path('api/token/', TokenObtainPairView.as_view(), name='get_token'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='refresh_token'),
    path('api/user/reset_password_request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/user/reset_password/', PasswordResetView.as_view(), name='password_reset'),
    path('api-auth/', include('rest_framework.urls')),
    #SURVEYS
    path('api/survey/get/', GetSurveyView.as_view(), name='view_survey'),
    path('api/survey/get/<int:id_surveys>/', GetSurveyDetailView.as_view(), name='view_detail_survey'),
    path('api/survey/create/', CreateSurveyView.as_view(), name='create_survey'),
    path('api/survey/update/<int:id_surveys>/', UpdateSurveyView.as_view(), name='update_survey'),
    #DIMENSIONS
    path('api/dimension/get/<int:surveys_id_surveys>/', GetDimensionView.as_view(), name='view_dimension'),
    path('api/dimension/create/<int:surveys_id_surveys>/', CreateDimensionView.as_view(), name='create_dimension'),
    path('api/dimension/update/<int:id_dimensions>/', UpdateDimensionView.as_view(), name='update_dimension'),
    path('api/dimension/delete/<int:id_dimensions>/', DeleteDimensionView.as_view(), name='delete_dimension'),
    #STATEMENTS
    path('api/statement/get/<int:dimensions_id_dimensions>/', GetStatementView.as_view(), name='view_statement'),
    path('api/statement/create/<int:dimensions_id_dimensions>/', CreateStatementView.as_view(), name='create_statement'),
    path('api/statement/update/<int:id_statements>/', UpdateStatementView.as_view(), name='update_statement'),
    path('api/statement/delete/<int:id_statements>/', DeleteStatementView.as_view(), name='delete_statement'),
    #SCALES
    path('api/scale/get/', GetScaleView.as_view(), name='view_scale'),
    path('api/scale/get/<int:id_scales>/', GetSingleScaleView.as_view(), name='view_scale'),
    path('api/scale/create/', CreateScaleView.as_view(), name='create_scale'),
    path('api/scale/update/<int:id_scales>/', UpdateScaleView.as_view(), name='update_scale'),
    #PROJECTS
    path('api/projects/get/', AdminAllProjectsView.as_view(), name='admin_all_projects'),
    path('api/project/get/<int:users_id_users>/', UserOwnProjectsView.as_view(), name='user_own_projects'),
    path('api/project/create/', CreateProjectView.as_view(), name='create_project'),
    path('api/project/update/<int:id_projects>/', UpdateProjectPhaseView.as_view(), name="update-project-phase"),
    path('api/project/adduser/<int:id_users>/<str:project_code>/', AddUserToProjectView.as_view(), name="add_user_to_existing_project"),
    path('api/projects/pendingrequests/', PendingRequestsView.as_view(), name='get_pending_requests'),
    path('api/projects/requests/decision/<int:id_users_has_projects>/', AcceptOrRefusePendingRequestView.as_view(), name='accept_or_refuse_request'),
    #SUBMISSIONS
    path('api/submission/', SubmissionViewSet.as_view({'get': 'list', 'post': 'create'}), name='submission-list'),
    path('api/submission/<int:id_submissions>/', 
         SubmissionViewSet.as_view({
             'get': 'retrieve',
             'put': 'update',
             'patch': 'update',
             'delete': 'destroy'
         }), 
         name='submission-detail'),
    #ANSWERS
    path('api/answer/<int:submissions_id_submissions>/', AnswerViewSet.as_view({ 'post': 'create'}), name='answer-list'),
    path('api/answer/<int:submissions_id_submissions>/', AnswerViewSet.as_view({ 'get': 'list'}), name='answer-list'),
    path(
    'api/answer/<int:submissions_id_submissions>/<int:statements_id_statements>/',
    AnswerViewSet.as_view({
        'get': 'retrieve_by_composite',
        'put': 'update_by_composite',
        'patch': 'update_by_composite',
        'delete': 'delete_by_composite'
    }),
    name='answer-composite'),
    #REPORTS
    # get all reports by submission id
    path('api/report/<int:submissions_id_submissions>/', ReportViewSet.as_view({
        'post': 'create',
        'get': 'list'
    }), name='report-create-or-list'),

    # get specific report by report_token
    path('api/report/detail/<str:report_token>/', ReportViewSet.as_view({
        'get': 'retrieve',
        'put': 'update',
        'patch': 'partial_update',
        'delete': 'destroy'
    }), name='report-detail'),
    path('api/report/copilot/<str:report_token>/', ReportCopilotView.as_view(), name='report-copilot'),
    #RECOMMENDATIONS
    path('api/recommendation/get/', GetOverallRecommendationsView.as_view(), name='get-recommendations'),
    path('api/recommendation/update/<int:id_overall_recommendations>/', UpdateOverallRecommendationsView.as_view(), name='update-recommendation'),
    #GROUNDING REFERENCES
    path('api/grounding-references/', GroundingReferenceListCreateView.as_view(), name='grounding-reference-list-create'),
    path('api/grounding-references/<int:id_grounding_reference>/', GroundingReferenceDetailView.as_view(), name='grounding-reference-detail'),
]
