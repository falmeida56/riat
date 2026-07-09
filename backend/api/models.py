from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models
from django.conf import settings


#PROJECTS

class Projects(models.Model):
    id_projects = models.AutoField(primary_key=True)
    project_name = models.CharField(max_length=100)
    project_acronym = models.CharField(max_length=25)
    project_organization = models.CharField(max_length=100)
    project_owner_name = models.CharField(max_length=100)
    project_phase = models.IntegerField()
    project_value_chain = models.CharField(max_length=25)
    project_trl = models.IntegerField()
    project_mrl = models.IntegerField()
    project_srl = models.IntegerField()
    project_creation_time = models.DateTimeField()
    project_unique_code = models.CharField(max_length=10, unique=True)

    class Meta:
        managed = False
        db_table = 'projects'


#USERS

class Users(models.Model):
    id_users = models.AutoField(primary_key=True)
    user_email = models.CharField(unique=True, max_length=100)
    user_role = models.IntegerField()
    user_password = models.CharField(max_length=32)
    user_creation_time = models.DateTimeField()
    last_login = models.DateTimeField(blank=True, null=True)
    password_reset_token = models.CharField(max_length=64, blank=True, null=True)
    password_reset_token_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'users'

#USERS_HAS_PROJECTS

class UsersHasProjects(models.Model):
    id_users_has_projects = models.AutoField(primary_key=True)
    users_id_users = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='users_id_users')
    projects_id_projects = models.ForeignKey('Projects', models.DO_NOTHING, db_column='projects_id_projects')
    users_has_projects_role = models.CharField(max_length=45)
    users_has_projects_function = models.CharField(max_length=45)
    users_has_projects_state = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'users_has_projects'
        unique_together = (('users_id_users', 'projects_id_projects'))


#SUBMISSIONS

class Submissions(models.Model):
    id_submissions = models.AutoField(primary_key=True)
    surveys_id_surveys = models.ForeignKey('Surveys', models.DO_NOTHING, db_column='surveys_id_surveys')
    users_has_projects_id_users_has_projects = models.ForeignKey('UsersHasProjects', models.DO_NOTHING, db_column='users_has_projects_id_users_has_projects')
    submission_state=models.IntegerField()
    submission_starting_time = models.DateTimeField()
    submission_ending_time = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = 'submissions'


#ANSWERS_BASE

class AnswersBase(models.Model):
    id_answers_base = models.AutoField(primary_key=True)
    statements_id_statements = models.ForeignKey('Statements', models.DO_NOTHING, db_column='statements_id_statements')
    submissions_id_submissions = models.ForeignKey('Submissions', models.DO_NOTHING, db_column='submissions_id_submissions')
    answer_creation_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'answers_base'
        unique_together = ('submissions_id_submissions', 'statements_id_statements')



class AnswersBoolean(models.Model):
    answers_base_id_answers_base = models.OneToOneField(AnswersBase, models.DO_NOTHING, db_column='answers_base_id_answers_base', primary_key=True)
    value = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'answers_boolean'


class AnswersInteger(models.Model):
    answers_base_id_answers_base = models.OneToOneField(AnswersBase, models.DO_NOTHING, db_column='answers_base_id_answers_base', primary_key=True)
    value = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'answers_integer'


class AnswersSelect(models.Model):
    answers_base_id_answers_base = models.OneToOneField(AnswersBase, models.DO_NOTHING, db_column='answers_base_id_answers_base', primary_key=True)
    value = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'answers_select'


class AnswersText(models.Model):
    answers_base_id_answers_base = models.OneToOneField(AnswersBase, models.DO_NOTHING, db_column='answers_base_id_answers_base', primary_key=True)
    value = models.TextField()

    class Meta:
        managed = False
        db_table = 'answers_text'


#STATEMENTS

class Statements(models.Model):
    id_statements = models.AutoField(primary_key=True)
    dimensions_id_dimensions = models.ForeignKey('Dimensions', models.DO_NOTHING, db_column='dimensions_id_dimensions')
    scales_id_scales = models.ForeignKey('Scales', models.DO_NOTHING, db_column='scales_id_scales')
    statement_name = models.CharField(max_length=500)
    statement_description = models.TextField(blank=True, null=True)
    statement_created_by = models.CharField(max_length=45)
    statement_modified_by = models.CharField(max_length=45)
    statement_last_modified_by_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'statements'


#SCALES

class Scales(models.Model):
    id_scales = models.AutoField(primary_key=True)
    scale_name = models.CharField(unique=True, max_length=45)
    scale_levels = models.IntegerField()
    scale_labels = models.CharField(max_length=256)

    class Meta:
        managed = False
        db_table = 'scales'


#DIMENSIONS

class Dimensions(models.Model):
    id_dimensions = models.AutoField(primary_key=True)
    surveys_id_surveys = models.ForeignKey('Surveys', models.DO_NOTHING, db_column='surveys_id_surveys')
    dimension_name = models.CharField(max_length=500)
    dimension_short_description = models.CharField(max_length = 300)
    dimension_description = models.TextField(blank=True, null=True)
    dimension_order = models.IntegerField()
    dimension_created_by = models.CharField(max_length=45)
    dimension_last_modified_by = models.CharField(max_length=45)
    dimension_last_modified_by_date = models.DateTimeField()
    parent_dimension = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL, related_name='sub_dimensions'
    )

    class Meta:
        managed = False
        db_table = 'dimensions'


#RECOMMENDATIONS

class Recommendations(models.Model):
    id_recommendations = models.AutoField(primary_key=True)
    dimensions_id_dimensions = models.ForeignKey('Dimensions', models.DO_NOTHING, db_column='dimensions_id_dimensions')
    score_levels_id_score_levels = models.ForeignKey('ScoreLevels', models.DO_NOTHING, db_column='score_levels_id_score_levels')
    recommendations_description = models.TextField(null=False)

    class Meta:
        managed = False
        db_table = 'recommendations'


#SCORE_LEVELS

class ScoreLevels(models.Model):
    id_score_levels = models.AutoField(primary_key=True)
    score_level_name = models.CharField(max_length=100)
    score_level_min_value = models.IntegerField()
    score_level_max_value = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'score_levels'


#SURVEYS

class Surveys(models.Model):
    id_surveys = models.AutoField(primary_key=True)
    survey_name = models.CharField(unique=True, max_length=45)
    survey_description = models.TextField()
    survey_creation_time = models.DateTimeField()
    survey_created_by = models.CharField(max_length=45)
    survey_modified_by = models.CharField(max_length=45)
    survey_last_modified_by_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'surveys'
        
        
#REPORTS_SCORE

class ReportsScore(models.Model):
    id_reports_score = models.AutoField(primary_key=True)
    reports_id_reports = models.ForeignKey('Reports', models.DO_NOTHING, db_column='reports_id_reports')
    dimensions_id_dimensions = models.ForeignKey('Dimensions', models.DO_NOTHING, db_column='dimensions_id_dimensions')
    reports_score_dimension_score = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'reports_score'


#REPORTS

class Reports(models.Model):
    id_reports = models.AutoField(primary_key=True)
    submissions_id_submissions = models.ForeignKey('Submissions', models.DO_NOTHING, db_column='submissions_id_submissions')
    reports_overall_score_id_reports_overall_score = models.ForeignKey('ReportsOverallScore', models.DO_NOTHING, db_column='reports_overall_score_id_reports_overall_score')
    report_creation_date = models.DateTimeField()
    report_token = models.CharField(max_length=32, blank=True, null=True)
    report_token_date = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        managed = False
        db_table = 'reports'


#REPORTS_OVERALL_SCORE

class ReportsOverallScore(models.Model):
    id_reports_overall_score = models.AutoField(primary_key=True)
    overall_recommendations_id_overall_recommendations = models.ForeignKey('OverallRecommendations', models.DO_NOTHING, db_column='overall_recommendations_id_overall_recommendations')
    reports_overall_score_value = models.IntegerField()
    reports_overall_score_max_value = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'reports_overall_score'
        
        
#OVERALL_RECOMMENDATIONS

class OverallRecommendations(models.Model):
    id_overall_recommendations = models.AutoField(primary_key=True)
    surveys_id_surveys = models.ForeignKey('Surveys', models.DO_NOTHING, db_column='surveys_id_surveys')
    overall_score_levels_id_overall_score_levels = models.ForeignKey('OverallScoreLevels', models.DO_NOTHING, db_column='overall_score_levels_id_overall_score_levels')
    overall_recommendation_name = models.CharField(max_length=100)
    overall_recommendations_description = models.TextField()
    
    class Meta:
        managed = False
        db_table = 'overall_recommendations'  
        

#OVERALL_SCORE_LEVELS

class OverallScoreLevels(models.Model):
    id_overall_score_levels = models.AutoField(primary_key=True)
    overall_score_level_name = models.CharField(max_length=100)
    overall_score_level_min_value = models.IntegerField()
    overall_score_level_max_value = models.IntegerField()
    
    class Meta:
        managed = False
        db_table = 'overall_score_levels'


class GroundingReference(models.Model):
    SOURCE_TYPES = [
        ('article', 'Scientific article'),
        ('framework', 'Framework or methodology'),
        ('standard', 'Standard or regulation'),
        ('report', 'Report or deliverable'),
        ('dataset', 'Dataset or extracted evidence'),
        ('internal', 'Internal RIAT note'),
        ('other', 'Other'),
    ]

    REVIEW_STATUSES = [
        ('draft', 'Draft'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('retired', 'Retired'),
    ]

    id_grounding_reference = models.AutoField(primary_key=True)
    source_key = models.CharField(max_length=80, unique=True)
    source_title = models.CharField(max_length=300)
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES, default='other')
    citation = models.TextField(blank=True)
    url = models.URLField(max_length=500, blank=True)
    summary = models.TextField(blank=True)
    guidance = models.TextField(blank=True)
    evidence_examples = models.TextField(blank=True)
    applies_to_all_dimensions = models.BooleanField(default=False)
    dimensions = models.ManyToManyField('Dimensions', blank=True, related_name='grounding_references')
    review_status = models.CharField(max_length=30, choices=REVIEW_STATUSES, default='draft')
    active = models.BooleanField(default=True)
    created_by = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'grounding_references'
        ordering = ['source_title']

    def __str__(self):
        return self.source_title
        
        
#CUSTOMUSER

class CustomUserManager(BaseUserManager):
    def create_user(self, user_email, password=None, **extra_fields):
        
        if not user_email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(user_email)
        user = self.model(user_email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        extra_fields.setdefault("user_role", 2)

        return user
        

    #def create_superuser(self, user_email, user_name, user_surname, user_password=None, **extra_fields):
    #    extra_fields.setdefault("user_role", 1)
    #    extra_fields.setdefault("is_superuser", True)
    #
    #   return self.create_user(user_email, user_name, user_surname, user_password, **extra_fields)


class CustomUser(AbstractBaseUser):
    id = models.AutoField(primary_key=True, db_column='id_users')
    user_email = models.EmailField(unique=True, null=False)
    user_role = models.IntegerField(null=False, default=2)
    password = models.CharField(max_length=128, db_column='user_password')
    user_creation_time = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(blank=True, null=True)
    password_reset_token = models.CharField(max_length=64, blank=True, null=True)
    password_reset_token_date = models.DateTimeField(blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'user_email'

    class Meta:
        db_table = 'users'
        managed = False
        
    def __str__(self):
        return self.user_email

    @property
    def is_staff(self):
        return self.user_role == 1

    @property
    def is_superuser(self):
        return self.user_role == 1

    @property
    def is_active(self):
        return True

    def has_perm(self, perm, obj=None):
        return self.is_staff

    def has_module_perms(self, app_label):
        return self.is_staff


### AUTOGENERATED DJANGO MODELS ### 

class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.IntegerField()
    username = models.CharField(unique=True, max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.IntegerField()
    is_active = models.IntegerField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.PositiveSmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey('AuthUser', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'
